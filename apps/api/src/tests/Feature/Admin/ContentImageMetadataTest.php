<?php

namespace Tests\Feature\Admin;

use App\Models\News;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ContentImageMetadataTest extends AdminFeatureTestCase
{
    private const SECRET = 'SECRET-GPS-40.0-98.3';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    /** TIFF con Orientation=6 y un valor sensible detrás del directorio. */
    private function tiff(string $byteOrder = 'MM'): string
    {
        [$short, $long] = $byteOrder === 'MM' ? ['n', 'N'] : ['v', 'V'];

        return $byteOrder.pack($short, 42).pack($long, 8)
            .pack($short, 1).pack($short, 0x0112).pack($short, 3).pack($long, 1).pack($short, 6).pack($short, 0).pack($long, 0)
            .self::SECRET;
    }

    private function gdImage(): \GdImage
    {
        $image = imagecreatetruecolor(8, 8);
        imagefilledrectangle($image, 0, 0, 7, 7, (int) imagecolorallocate($image, 200, 40, 40));

        return $image;
    }

    private function encoded(callable $encoder): string
    {
        ob_start();
        $encoder($this->gdImage());

        return (string) ob_get_clean();
    }

    private function jpegSegment(int $marker, string $payload): string
    {
        return "\xFF".chr($marker).pack('n', strlen($payload) + 2).$payload;
    }

    /** JPEG como el de un iPhone: EXIF con GPS, XMP, ICC, MPF, comentario y mapa de ganancia al final. */
    private function iphoneLikeJpeg(): string
    {
        $base = $this->encoded(fn ($image) => imagejpeg($image));

        return "\xFF\xD8"
            .$this->jpegSegment(0xE1, "Exif\0\0".$this->tiff())
            .$this->jpegSegment(0xE1, 'http://ns.adobe.com/xap/1.0/'."\0".'<hdrgm:Version>1.0</hdrgm:Version>'.self::SECRET)
            .$this->jpegSegment(0xE2, "ICC_PROFILE\0\x01\x01Display P3")
            .$this->jpegSegment(0xE2, "MPF\0".self::SECRET)
            .$this->jpegSegment(0xFE, self::SECRET)
            .substr($base, 2)
            .$base.'HDRGainMap';
    }

    private function pngChunk(string $type, string $data): string
    {
        return pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));
    }

    private function pngWithMetadata(): string
    {
        $base = $this->encoded(fn ($image) => imagepng($image));
        $headerEnd = 8 + 25;

        return substr($base, 0, $headerEnd)
            .$this->pngChunk('eXIf', $this->tiff('II'))
            .$this->pngChunk('tEXt', 'Location'."\0".self::SECRET)
            .$this->pngChunk('cICP', "\x09\x10\x00\x01")
            .substr($base, $headerEnd);
    }

    private function webpChunk(string $type, string $data): string
    {
        return $type.pack('V', strlen($data)).$data.(strlen($data) % 2 === 1 ? "\0" : '');
    }

    private function webpWithMetadata(): string
    {
        $simple = $this->encoded(fn ($image) => imagewebp($image));
        $flags = 0x20 | 0x08 | 0x04;
        $canvas = substr(pack('V', 7), 0, 3).substr(pack('V', 7), 0, 3);
        $body = 'WEBP'
            .$this->webpChunk('VP8X', chr($flags)."\0\0\0".$canvas)
            .$this->webpChunk('ICCP', 'Display P3')
            .substr($simple, 12)
            .$this->webpChunk('EXIF', $this->tiff())
            .$this->webpChunk('XMP ', self::SECRET);

        return 'RIFF'.pack('V', strlen($body)).$body;
    }

    private function upload(string $bytes, string $name)
    {
        $path = tempnam(sys_get_temp_dir(), 'arca-image-');
        file_put_contents($path, $bytes);
        $this->beforeApplicationDestroyed(fn () => @unlink($path));
        $admin = $this->createAccount('admin');

        return $this->actAs($admin)->post('/api/v1/admin/news', [
            'title' => 'Noticia '.bin2hex(random_bytes(3)),
            'description' => 'D',
            'content' => 'Contenido',
            'category' => 'General',
            'published_date' => '2099-05-01',
            'image' => new UploadedFile($path, $name, null, null, true),
        ], ['Accept' => 'application/json']);
    }

    private function storedBytes($response): string
    {
        return (string) Storage::disk('public')->get($response->assertCreated()->json('data.image_path'));
    }

    private function orientationSix(string $bytes): bool
    {
        return str_contains($bytes, pack('nnN', 0x0112, 3, 1).pack('n', 6));
    }

    /** CA-14 */
    public function test_ca14_event_news_images_jpeg_loses_metadata_and_hdr_but_keeps_pixels_color_and_orientation(): void
    {
        $original = $this->iphoneLikeJpeg();
        $stored = $this->storedBytes($this->upload($original, 'a.jpg'));

        foreach ([self::SECRET, 'hdrgm', 'HDRGainMap', "MPF\0"] as $removed) {
            $this->assertStringNotContainsString($removed, $stored);
        }

        $this->assertStringContainsString("ICC_PROFILE\0\x01\x01Display P3", $stored);
        $this->assertTrue($this->orientationSix($stored));
        $this->assertStringEndsWith("\xFF\xD9", $stored);

        $base = $this->encoded(fn ($image) => imagejpeg($image));
        $scan = substr($base, (int) strpos($base, "\xFF\xDA"));
        $this->assertStringEndsWith($scan, $stored, 'Los píxeles comprimidos deben quedar idénticos.');
        $this->assertNotFalse(imagecreatefromstring($stored));
    }

    /** CA-14 */
    public function test_ca14_event_news_images_png_and_webp_lose_metadata_and_hdr_but_keep_color_and_orientation(): void
    {
        $png = $this->storedBytes($this->upload($this->pngWithMetadata(), 'a.png'));
        $this->assertStringNotContainsString(self::SECRET, $png);
        $this->assertStringNotContainsString('cICP', $png);
        $this->assertStringNotContainsString('tEXt', $png);
        $this->assertTrue($this->orientationSix($png));
        $this->assertNotFalse(imagecreatefromstring($png));

        $webp = $this->storedBytes($this->upload($this->webpWithMetadata(), 'a.webp'));
        $this->assertStringNotContainsString(self::SECRET, $webp);
        $this->assertStringNotContainsString('XMP ', $webp);
        $this->assertStringContainsString('ICCP', $webp);
        $this->assertTrue($this->orientationSix($webp));
        $this->assertSame(strlen($webp) - 8, unpack('V', substr($webp, 4, 4))[1]);
        $flags = ord($webp[strpos($webp, 'VP8X') + 8]);
        $this->assertSame(0x20 | 0x08, $flags);
        $this->assertNotFalse(imagecreatefromstring($webp));
    }

    /** CA-14 */
    public function test_ca14_event_news_images_normal_orientation_keeps_no_exif_and_events_are_also_clean(): void
    {
        $jpeg = str_replace(pack('n', 6).pack('n', 0).pack('N', 0).self::SECRET, pack('n', 1).pack('n', 0).pack('N', 0).self::SECRET, $this->iphoneLikeJpeg());
        $stored = $this->storedBytes($this->upload($jpeg, 'a.jpg'));
        $this->assertStringNotContainsString("Exif\0\0", $stored);

        $path = tempnam(sys_get_temp_dir(), 'arca-image-');
        file_put_contents($path, $this->iphoneLikeJpeg());
        $this->beforeApplicationDestroyed(fn () => @unlink($path));
        $response = $this->actAs($this->createAccount('admin'))->post('/api/v1/admin/events', [
            'name' => 'Evento '.bin2hex(random_bytes(3)),
            'start_date' => '2099-05-01',
            'image' => new UploadedFile($path, 'a.jpg', null, null, true),
        ], ['Accept' => 'application/json']);

        $this->assertStringNotContainsString(self::SECRET, $this->storedBytes($response));
    }

    /** CA-15 */
    public function test_ca15_event_news_images_unprocessable_image_returns_422_and_writes_nothing(): void
    {
        $base = $this->encoded(fn ($image) => imagejpeg($image));
        $truncated = substr($base, 0, (int) strpos($base, "\xFF\xDA") + 20);
        $newsBefore = News::query()->count();

        $response = $this->upload($truncated, 'a.jpg');

        $response->assertStatus(422)->assertJsonValidationErrors('image');
        $this->assertSame('No se pudo procesar la imagen. Prueba con otro archivo.', $response->json('errors.image.0'));
        $this->assertSame([], Storage::disk('public')->allFiles());
        $this->assertSame($newsBefore, News::query()->count());
    }
}
