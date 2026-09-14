import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker dynamically from CDN if module URL not resolved
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Extracts pages, text items with positions, and renders page background images.
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

    // Render background image to canvas
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
      // tx[4] = left, tx[5] = top (from top of viewport)
      const fontSize = Math.abs(item.transform[0] || item.transform[3] || 12) * viewport.scale;

      items.push({
        id: `p${pageNum}_i${index}`,
        originalText: item.str,
        text: item.str,
        x: tx[4],
        y: tx[5] - fontSize,
        width: item.width * viewport.scale,
        height: fontSize * 1.2,
        fontSize: Math.max(10, Math.min(48, Math.round(fontSize / 1.5))), // normalized fontSize
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
      items,
    });
  }

  return pages;
}

/**
 * Exports modified PDF using pdf-lib by covering edited text with white boxes and writing new text.
 */
export async function exportPdfWithTextEdits(file, pagesData, addedBlocks = []) {
  const fileArrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileArrayBuffer);

  // Embed standard font
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pdfPages = pdfDoc.getPages();

  for (let i = 0; i < pagesData.length; i++) {
    const pageData = pagesData[i];
    const pdfPage = pdfPages[i];
    if (!pdfPage) continue;

    const { height: pdfPageHeight } = pdfPage.getSize();

    // Process edited text items
    pageData.items.forEach((item) => {
      // Check if text was modified or deleted
      if (item.text !== item.originalText) {
        const itemX = item.pdfX;
        const itemY = item.pdfY;
        const itemW = Math.max(item.pdfWidth, (item.originalText.length * item.pdfHeight * 0.5));
        const itemH = item.pdfHeight || item.fontSize || 12;

        // Cover old text with a white rectangle
        pdfPage.drawRectangle({
          x: itemX - 1,
          y: itemY - 2,
          width: itemW + 4,
          height: itemH + 4,
          color: rgb(1, 1, 1),
        });

        // Draw new text if not empty
        if (item.text && item.text.trim()) {
          try {
            // Sanitize text for standard font (remove non-latin special characters if needed)
            const cleanText = item.text.replace(/[^\x00-\x7F]/g, '');

            pdfPage.drawText(cleanText || item.text, {
              x: itemX,
              y: itemY,
              size: item.fontSize || 12,
              font: helveticaFont,
              color: rgb(0.1, 0.1, 0.1),
            });
          } catch (e) {
            console.warn('Font encoding fallback:', e);
            pdfPage.drawText(item.text, {
              x: itemX,
              y: itemY,
              size: item.fontSize || 12,
              color: rgb(0.1, 0.1, 0.1),
            });
          }
        }
      }
    });

    // Process user added custom text blocks
    const pageAdded = addedBlocks.filter(b => b.pageNum === pageData.pageNum);
    pageAdded.forEach((b) => {
      if (!b.text || !b.text.trim()) return;

      // Scale coordinates from canvas space to PDF space
      const scaleX = pageData.pdfWidth / pageData.width;
      const scaleY = pageData.pdfHeight / pageData.height;

      const pdfX = b.x * scaleX;
      const pdfY = pdfPageHeight - (b.y * scaleY);

      try {
        const cleanText = b.text.replace(/[^\x00-\x7F]/g, '');
        pdfPage.drawText(cleanText || b.text, {
          x: pdfX,
          y: pdfY - (b.fontSize || 14),
          size: (b.fontSize || 14) * scaleY,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
      } catch (err) {
        console.warn('Failed to draw custom text:', err);
      }
    });
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
