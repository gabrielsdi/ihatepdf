import { PDFDocument, rgb } from 'pdf-lib';

/**
 * Exports the PDF with all canvas annotations burned in.
 * For each page, renders its annotation canvas on top of the PDF page.
 */
export async function exportPdfWithAnnotations(file, annotations, canvasRefs, numPages) {
  // Load original PDF
  const fileArrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileArrayBuffer);

  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1;
    const canvas = canvasRefs[pageNum];
    const pageAnnotations = annotations[pageNum] || [];

    if (!canvas || pageAnnotations.length === 0) continue;

    const page = pages[i];
    const { width: pdfWidth, height: pdfHeight } = page.getSize();

    // Get canvas dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Scale factors from canvas space to PDF space
    const scaleX = pdfWidth / canvasWidth;
    const scaleY = pdfHeight / canvasHeight;

    // Draw each annotation into the PDF page
    for (const ann of pageAnnotations) {
      try {
        switch (ann.type) {
          case 'text': {
            const [r, g, b] = hexToRgb(ann.color);
            // Convert canvas Y to PDF Y (PDF origin is bottom-left)
            const pdfY = pdfHeight - ann.y * scaleY;
            page.drawText(ann.text || '', {
              x: ann.x * scaleX,
              y: pdfY - (ann.fontSize || 16) * scaleY,
              size: (ann.fontSize || 16) * Math.min(scaleX, scaleY),
              color: rgb(r, g, b),
              opacity: 1,
            });
            break;
          }

          case 'rect': {
            const [r, g, b] = hexToRgb(ann.color);
            const pdfY = pdfHeight - (ann.y + ann.h) * scaleY;
            page.drawRectangle({
              x: ann.x * scaleX,
              y: ann.h < 0 ? pdfY + ann.h * scaleY : pdfY,
              width: Math.abs(ann.w * scaleX),
              height: Math.abs(ann.h * scaleY),
              borderColor: rgb(r, g, b),
              borderWidth: (ann.lineWidth || 3) * Math.min(scaleX, scaleY),
              opacity: 1,
            });
            break;
          }

          case 'highlight': {
            const [r, g, b] = hexToRgb(ann.color);
            const pdfY = pdfHeight - (ann.y + ann.h) * scaleY;
            page.drawRectangle({
              x: ann.x * scaleX,
              y: ann.h < 0 ? pdfY + ann.h * scaleY : pdfY,
              width: Math.abs(ann.w * scaleX),
              height: Math.abs(ann.h * scaleY),
              color: rgb(r, g, b),
              opacity: 0.35,
            });
            break;
          }

          case 'freehand': {
            if (!ann.points || ann.points.length < 2) break;
            const [r, g, b] = hexToRgb(ann.color);
            // Draw as a series of lines
            for (let j = 0; j < ann.points.length - 1; j++) {
              const p1 = ann.points[j];
              const p2 = ann.points[j + 1];
              page.drawLine({
                start: { x: p1.x * scaleX, y: pdfHeight - p1.y * scaleY },
                end:   { x: p2.x * scaleX, y: pdfHeight - p2.y * scaleY },
                color: rgb(r, g, b),
                thickness: (ann.lineWidth || 3) * Math.min(scaleX, scaleY),
                opacity: 1,
              });
            }
            break;
          }

          case 'line': {
            const [r, g, b] = hexToRgb(ann.color);
            page.drawLine({
              start: { x: ann.x * scaleX, y: pdfHeight - ann.y * scaleY },
              end:   { x: (ann.x + ann.w) * scaleX, y: pdfHeight - (ann.y + ann.h) * scaleY },
              color: rgb(r, g, b),
              thickness: (ann.lineWidth || 3) * Math.min(scaleX, scaleY),
              opacity: 1,
            });
            break;
          }

          default:
            break;
        }
      } catch (e) {
        console.warn('Error drawing annotation:', ann.type, e);
      }
    }
  }

  // Save and trigger download
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${file.name.replace('.pdf', '')}_torturado.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert hex color "#rrggbb" to [r, g, b] in 0-1 range for pdf-lib
 */
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return [r, g, b];
}
