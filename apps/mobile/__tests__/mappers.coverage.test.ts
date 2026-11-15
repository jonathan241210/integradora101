import {
  mapEnclosureToMapPlace,
  mapEventToZooEventModel,
  mapSpeciesToAnimalModel,
} from '../src/repositories/mappers';

describe('mobile-011 CA-05: mapeadores de respuestas API para Mobile', () => {
  it('normaliza categorías, imágenes, talla y campos opcionales de especie', () => {
    expect(mapSpeciesToAnimalModel({
      id: 1, common_name: 'León', scientific_name: 'Panthera leo',
      category: 'mammal', image_url: 'https://img.test/leon.jpg',
    })).toMatchObject({
      id: '1', category: 'mammals', imageUrl: 'https://img.test/leon.jpg',
      zone: 'Zona General', isDiscovered: false, placeholderTint: '#8A9A5B',
    });

    expect(mapSpeciesToAnimalModel({
      id: '2', common_name: 'Ave', scientific_name: 'Aves test',
      category: 'bird', photo_path: 'ave.jpg', size_cm: 0, longevity: '8 años',
      diet_description: 'Frutos', characteristics: 'Plumas verdes',
    })).toMatchObject({
      id: '2', category: 'birds', imageUrl: undefined,
      stats: { size: '', lifeExpectancy: '8 años' },
      diet: 'Frutos', curiosities: 'Plumas verdes',
    });

    expect(mapSpeciesToAnimalModel({
      id: 3, common_name: 'Reptil', scientific_name: 'Reptilia',
      category: 'reptile', size: 'Grande', life_expectancy: '20 años',
      diet: 'Insectos', curiosities: 'Dato', fun_fact: 'Curiosidad',
    })).toMatchObject({
      category: 'reptiles',
      stats: { size: 'Grande', lifeExpectancy: '20 años' },
      diet: 'Insectos', curiosities: 'Dato', funFact: 'Curiosidad',
    });

    expect(mapSpeciesToAnimalModel({
      id: 4, common_name: 'Pez', scientific_name: 'Pisces', category: 'fish',
      placeholder_tint: '#123456', size_cm: 12,
    })).toMatchObject({
      category: 'aquatic', placeholderTint: '#123456', stats: { size: '12 cm' },
    });
    expect(mapSpeciesToAnimalModel({
      id: 5, common_name: 'Anfibio', scientific_name: 'Amphibia', category: 'amphibian',
    }).category).toBe('aquatic');
    expect(mapSpeciesToAnimalModel({
      id: 6, common_name: 'Desconocido', scientific_name: 'N/A', category: 'other',
      image_url: '', photo_path: '',
    })).toMatchObject({ category: undefined, imageUrl: undefined });
    expect(mapSpeciesToAnimalModel({
      id: 7, common_name: 'Sin categoría', scientific_name: 'N/A',
    }).category).toBeUndefined();
  });

  it('mapea alias y valores opcionales de eventos', () => {
    expect(mapEventToZooEventModel({
      id: 1, name: 'Visita', start_date: '2026-11-01', start_time: '09:30:00',
      image_path: 'visita.jpg',
    })).toEqual({
      id: '1', title: 'Visita', date: '2026-11-01', time: '09:30 hrs',
      location: 'Nicolás Bravo', description: '', imageUrls: undefined,
    });

    expect(mapEventToZooEventModel({
      id: '2', title: 'Taller', date: '2026-11-02', time: '14:00',
      location: 'Plaza', description: 'Descripción', image_urls: ['1.jpg', '2.jpg'],
    })).toMatchObject({ title: 'Taller', date: '2026-11-02', time: '14:00', imageUrls: undefined });
    expect(mapEventToZooEventModel({ id: 3 })).toMatchObject({
      title: 'Evento en el Zoológico', date: '', time: '', location: 'Nicolás Bravo',
      description: '', imageUrls: undefined,
    });
    expect(mapEventToZooEventModel({ id: 4, image_urls: [] }).imageUrls).toBeUndefined();
  });

  it('calcula coordenadas y describe recintos con y sin detalle animal', () => {
    expect(mapEnclosureToMapPlace({
      id: 1, name: 'Felinos', map_x: 0.2, map_y: 0.7,
      animals: [{
        id: 11, name: 'Tigre', species_name: 'Tigre de Bengala',
        sex: null, age: '4 años', origin: 'India', longevity: '15 años',
        diet: 'Carnívoro', reproduction: 'Vivíparo', stay_status: 'En observación',
        characteristics: 'Rayas', photo_path: 'tigre.jpg',
      }],
    })).toMatchObject({
      mapX: 0.2,
      mapY: 0.7,
      description: 'Habitan: Tigre.',
      animals: [{
        id: '11', name: 'Tigre', speciesName: 'Tigre de Bengala',
        age: '4 años', origin: 'India', longevity: '15 años',
        veterinaryStatus: 'Estatus: En observación', funFact: 'Rayas', photoPath: 'tigre.jpg',
      }],
    });

    expect(mapEnclosureToMapPlace({
      id: '2', name: 'Acuario', gps_lat: 20.061, gps_lon: -98.414,
      animals: [{ id: 22, name: '', species_name: 'Pez', species: {
        id: 22, common_name: 'Pez de colores', scientific_name: 'Carassius',
      } }],
    })).toMatchObject({
      description: 'Habitan: Pez.',
      animals: [{ speciesName: 'Pez', scientificName: 'Carassius' }],
    });

    const fallback = mapEnclosureToMapPlace({ id: 3, name: 'Sin GPS' });
    expect(fallback).toMatchObject({
      mapX: 0.5, mapY: 0.5, description: 'Recinto de Sin GPS.', animals: undefined,
    });
    expect(fallback.gpsLat).toBeGreaterThan(0);
    expect(fallback.gpsLon).toBeLessThan(0);
  });
});
