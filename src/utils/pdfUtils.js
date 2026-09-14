import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker dynamically from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Renders PDF pages to high-resolution clean canvas background images.
 */
export async function extractPdfPages(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    // Render at high resolution (scale 2.0) for crisp clean text rendering
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Fill white background before rendering
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: context, viewport }).promise;
    const bgImageUrl = canvas.toDataURL('image/png');

    pages.push({
      pageNum,
      width: viewport.width / 2.0, // normalized page width in CSS pixels
      height: viewport.height / 2.0, // normalized page height in CSS pixels
      pdfWidth: page.view[2] - page.view[0],
      pdfHeight: page.view[3] - page.view[1],
      bgImageUrl,
    });
  }

  return pages;
}

/**
 * Exports modified PDF burning all user added draggable layers into the PDF document.
 */
export async function exportPdfWithLayers(file, pagesData, layers) {
  const fileArrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileArrayBuffer);

  // Standard fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

  const pdfPages = pdfDoc.getPages();

  for (let i = 0; i < pagesData.length; i++) {
    const pageData = pagesData[i];
    const pdfPage = pdfPages[i];
    if (!pdfPage) continue;

    const { height: pdfPageHeight } = pdfPage.getSize();
    const scaleX = pageData.pdfWidth / pageData.width;
    const scaleY = pageData.pdfHeight / pageData.height;

    // Filter layers for current page
    const pageLayers = layers.filter(l => l.pageNum === pageData.pageNum);

    for (const layer of pageLayers) {
      if (!layer.text || !layer.text.trim()) continue;

      // Select font style
      let font = helvetica;
      if (layer.isBold && layer.isItalic) font = helveticaBoldOblique;
      else if (layer.isBold) font = helveticaBold;
      else if (layer.isItalic) font = helveticaOblique;

      // Calculate PDF coordinates (PDF origin is bottom-left)
      const pdfX = layer.x * scaleX;
      const pdfY = pdfPageHeight - ((layer.y + (layer.height || 30)) * scaleY);

      // Draw background rectangle if fill color set (e.g. white box to cover original text)
      if (layer.bgColor && layer.bgColor !== 'transparent') {
        const [bgR, bgG, bgB] = hexToRgb(layer.bgColor);
        pdfPage.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: (layer.width || 120) * scaleX,
          height: (layer.height || 40) * scaleY,
          color: rgb(bgR, bgG, bgB),
        });
      }

      // Parse text color
      const [r, g, b] = hexToRgb(layer.color || '#000000');

      try {
        const cleanText = layer.text.replace(/[^\x00-\x7F]/g, '');
        pdfPage.drawText(cleanText || layer.text, {
          x: pdfX + (4 * scaleX),
          y: pdfY + (4 * scaleY),
          size: (layer.fontSize || 16) * Math.min(scaleX, scaleY),
          font,
          color: rgb(r, g, b),
        });
      } catch (err) {
        console.warn('Fallback drawing text:', err);
        pdfPage.drawText(layer.text, {
          x: pdfX + (4 * scaleX),
          y: pdfY + (4 * scaleY),
          size: (layer.fontSize || 16) * Math.min(scaleX, scaleY),
          color: rgb(r, g, b),
        });
      }
    }
  }

  // Save modified PDF
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${file.name.replace('.pdf', '')}_editado.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function hexToRgb(hex) {
  if (!hex || hex === 'transparent') return [1, 1, 1];
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [r || 0, g || 0, b || 0];
}
