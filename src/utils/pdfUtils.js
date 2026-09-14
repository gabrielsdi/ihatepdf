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
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: context, viewport }).promise;
    const bgImageUrl = canvas.toDataURL('image/png');

    pages.push({
      pageNum,
      width: viewport.width / 2.0,
      height: viewport.height / 2.0,
      pdfWidth: page.view[2] - page.view[0],
      pdfHeight: page.view[3] - page.view[1],
      bgImageUrl,
    });
  }

  return pages;
}

/**
 * Exports modified PDF burning all text, image, draw, and shape layers into the PDF document.
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

    const pageLayers = layers.filter(l => l.pageNum === pageData.pageNum);

    for (const layer of pageLayers) {
      const pdfX = layer.x * scaleX;
      const pdfY = pdfPageHeight - ((layer.y + (layer.height || 40)) * scaleY);
      const pdfW = (layer.width || 100) * scaleX;
      const pdfH = (layer.height || 40) * scaleY;

      // 1. TEXT LAYERS
      if (layer.type === 'text') {
        if (!layer.text || !layer.text.trim()) continue;

        let font = helvetica;
        if (layer.isBold && layer.isItalic) font = helveticaBoldOblique;
        else if (layer.isBold) font = helveticaBold;
        else if (layer.isItalic) font = helveticaOblique;

        // Optional background fill box (e.g. white to cover original text)
        if (layer.bgColor && layer.bgColor !== 'transparent') {
          const [bgR, bgG, bgB] = hexToRgb(layer.bgColor);
          pdfPage.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: pdfW,
            height: pdfH,
            color: rgb(bgR, bgG, bgB),
          });
        }

        const [r, g, b] = hexToRgb(layer.color || '#000000');

        try {
          const cleanText = layer.text.replace(/[^\x00-\x7F]/g, '');
          pdfPage.drawText(cleanText || layer.text, {
            x: pdfX + (4 * scaleX),
            y: pdfY + (6 * scaleY),
            size: (layer.fontSize || 16) * Math.min(scaleX, scaleY),
            font,
            color: rgb(r, g, b),
          });
        } catch (err) {
          console.warn('Fallback drawing text:', err);
          pdfPage.drawText(layer.text, {
            x: pdfX + (4 * scaleX),
            y: pdfY + (6 * scaleY),
            size: (layer.fontSize || 16) * Math.min(scaleX, scaleY),
            color: rgb(r, g, b),
          });
        }
      }

      // 2. IMAGE LAYERS
      else if (layer.type === 'image' && layer.imageDataUrl) {
        try {
          let embeddedImg;
          if (layer.imageDataUrl.startsWith('data:image/png')) {
            embeddedImg = await pdfDoc.embedPng(layer.imageDataUrl);
          } else {
            // Convert JPEG or other formats
            embeddedImg = await pdfDoc.embedJpg(layer.imageDataUrl);
          }

          pdfPage.drawImage(embeddedImg, {
            x: pdfX,
            y: pdfY,
            width: pdfW,
            height: pdfH,
          });
        } catch (imgErr) {
          console.warn('Could not embed image layer into PDF:', imgErr);
        }
      }

      // 3. SHAPE LAYERS (Rectangles)
      else if (layer.type === 'shape') {
        const [r, g, b] = hexToRgb(layer.color || '#e8003d');
        const [bgR, bgG, bgB] = hexToRgb(layer.bgColor || 'transparent');

        pdfPage.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: pdfW,
          height: pdfH,
          borderColor: rgb(r, g, b),
          borderWidth: 2 * scaleX,
          color: layer.bgColor !== 'transparent' ? rgb(bgR, bgG, bgB) : undefined,
        });
      }

      // 4. FREEHAND DRAW LAYERS
      else if (layer.type === 'draw' && layer.points && layer.points.length > 1) {
        const [r, g, b] = hexToRgb(layer.color || '#e8003d');
        const thickness = (layer.lineWidth || 3) * Math.min(scaleX, scaleY);

        for (let j = 0; j < layer.points.length - 1; j++) {
          const p1 = layer.points[j];
          const p2 = layer.points[j + 1];

          pdfPage.drawLine({
            start: { x: p1.x * scaleX, y: pdfPageHeight - (p1.y * scaleY) },
            end: { x: p2.x * scaleX, y: pdfPageHeight - (p2.y * scaleY) },
            color: rgb(r, g, b),
            thickness,
          });
        }
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
  return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b];
}
