import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker dynamically from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Extracts pages, background images, and text items with precise positioning.
 */
export async function extractPdfPages(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    // Render page to high-res canvas background image
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    const bgImageUrl = canvas.toDataURL('image/png');

    // Extract text items
    const textContent = await page.getTextContent();
    const items = [];

    textContent.items.forEach((item, index) => {
      if (!item.str || item.str.trim().length === 0) return;

      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const fontSize = Math.abs(item.transform[0] || item.transform[3] || 12) * viewport.scale;

      items.push({
        id: `extracted_p${pageNum}_${index}`,
        pageNum,
        type: 'text',
        originalText: item.str,
        text: item.str,
        x: tx[4],
        y: tx[5] - fontSize,
        width: Math.max(60, item.width * viewport.scale),
        height: fontSize * 1.3,
        fontSize: Math.max(12, Math.round(fontSize / 1.5)),
        fontFamily: 'Arial',
        isBold: false,
        isItalic: false,
        color: '#000000',
        pdfX: item.transform[4],
        pdfY: item.transform[5],
        pdfWidth: item.width,
        pdfHeight: item.height || Math.abs(item.transform[3] || 12),
      });
    });

    pages.push({
      pageNum,
      width: viewport.width,
      height: viewport.height,
      pdfWidth: page.view[2] - page.view[0],
      pdfHeight: page.view[3] - page.view[1],
      bgImageUrl,
      extractedItems: items,
    });
  }

  return pages;
}

/**
 * Exports modified PDF burning all draggable text layers into the PDF document.
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
      else if (layer.isBold) font = helveticaBoldBold || helveticaBold;
      else if (layer.isItalic) font = helveticaOblique;

      // Calculate PDF coordinates (PDF origin is bottom-left)
      let pdfX, pdfY;

      if (layer.pdfX !== undefined && layer.pdfY !== undefined) {
        // If layer was extracted from original text, calculate position
        pdfX = layer.pdfX + ((layer.x - (layer.initialX || layer.x)) * scaleX);
        pdfY = layer.pdfY - ((layer.y - (layer.initialY || layer.y)) * scaleY);

        // Cover old text with a clean white rectangle
        pdfPage.drawRectangle({
          x: layer.pdfX - 1,
          y: layer.pdfY - 2,
          width: Math.max(layer.pdfWidth, (layer.originalText || '').length * (layer.pdfHeight || 12) * 0.5) + 4,
          height: (layer.pdfHeight || layer.fontSize) + 4,
          color: rgb(1, 1, 1),
        });
      } else {
        // User added new layer
        pdfX = layer.x * scaleX;
        pdfY = pdfPageHeight - ((layer.y + (layer.height || 30)) * scaleY);
      }

      // Parse color
      const [r, g, b] = hexToRgb(layer.color || '#000000');

      try {
        const cleanText = layer.text.replace(/[^\x00-\x7F]/g, '');
        pdfPage.drawText(cleanText || layer.text, {
          x: pdfX,
          y: pdfY,
          size: (layer.fontSize || 16) * Math.min(scaleX, scaleY),
          font,
          color: rgb(r, g, b),
        });
      } catch (err) {
        console.warn('Fallback drawing text:', err);
        pdfPage.drawText(layer.text, {
          x: pdfX,
          y: pdfY,
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
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [r, g, b] || [0, 0, 0];
}
