// Genera el PDF de la hoja impresa, lo descarga y lo abre en otra pestaña.
export async function exportSheetPdf(sheet: HTMLElement, filename: string): Promise<void> {
  const tab = window.open('', '_blank');
  const copy = sheet.cloneNode(true) as HTMLElement;
  copy.classList.add('is-capturing');

  try {
    const { default: html2pdf } = await import('html2pdf.js');
    const options = {
      margin: [8, 8, 8, 8],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], before: '.sheet-page-break', avoid: ['tr', '.sheet-evaluation h3'] },
    };
    const blob: Blob = await html2pdf()
      .set(options as never)
      .from(copy)
      .outputPdf('blob');

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    if (tab) {
      tab.location.href = url;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    console.error(error);
    tab?.close();
    throw error;
  }
}

