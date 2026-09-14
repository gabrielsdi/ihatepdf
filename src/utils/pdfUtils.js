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
        const fontSize = (layer.fontSize || 16) * Math.min(scaleX, scaleY);
        const lineHeight = fontSize * 1.15;

        const lines = wrapText(layer.text, font, fontSize, pdfW - (8 * scaleX));
        let currentY = pdfY + pdfH - fontSize - (2 * scaleY);

        for (const lineText of lines) {
          if (currentY < pdfY - fontSize) break;

          // Strategy: try original text first (pdf-lib standard fonts support WinAnsi
          // which includes Latin accented chars: é á ó ú ñ ü etc.).
          // Only fall back to stripping if pdf-lib actually throws an error.
          let drawn = false;

          // Attempt 1: draw original text as-is
          try {
            pdfPage.drawText(lineText, {
              x: pdfX + (4 * scaleX),
              y: currentY,
              size: fontSize,
              font,
              color: rgb(r, g, b),
            });
            drawn = true;
          } catch (_) { /* fall through */ }

          // Attempt 2: NFD normalize — converts é→e+◌́, then strip combining marks only
          // This preserves the base letter (e.g. é→e, ñ→n) instead of deleting the whole char
          if (!drawn) {
            try {
              const normalized = lineText
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, ''); // strip combining diacritics only
              if (normalized) {
                pdfPage.drawText(normalized, {
                  x: pdfX + (4 * scaleX),
                  y: currentY,
                  size: fontSize,
                  font,
                  color: rgb(r, g, b),
                });
                drawn = true;
              }
            } catch (_) { /* fall through */ }
          }

          // Attempt 3: last resort — strip everything outside ASCII
          if (!drawn) {
            try {
              const asciiOnly = lineText.replace(/[^\x00-\x7F]/g, '');
              if (asciiOnly) {
                pdfPage.drawText(asciiOnly, {
                  x: pdfX + (4 * scaleX),
                  y: currentY,
                  size: fontSize,
                  font,
                  color: rgb(r, g, b),
                });
              }
            } catch (err) {
              console.warn('Could not draw text line:', lineText, err);
            }
          }

          currentY -= lineHeight;
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
        const [r, g, b] = hexToRgb(layer.color || '#000000');
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

      // 4. FREEHAND DRAW LAYERS — exported as a single SVG path for smooth strokes (no veteado)
      else if (layer.type === 'draw' && layer.points && layer.points.length > 1) {
        const [r, g, b] = hexToRgb(layer.color || '#000000');
        const thickness = (layer.lineWidth || 3) * Math.min(scaleX, scaleY);

        // Build SVG path string in PDF coordinate space (Y axis is inverted in PDF)
        // layer.points are stored as absolute coordinates relative to the page canvas
        const pathParts = layer.points.map((pt, idx) => {
          const px = pt.x * scaleX;
          const py = pdfPageHeight - (pt.y * scaleY);
          return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(3)} ${py.toFixed(3)}`;
        });

        const svgPath = pathParts.join(' ');

        try {
          pdfPage.drawSvgPath(svgPath, {
            color: undefined,        // no fill
            borderColor: rgb(r, g, b),
            borderWidth: thickness,
            borderLineCap: 1,        // Round cap (pdf-lib LineCapStyle.Round = 1)
            borderLineJoin: 1,       // Round join (pdf-lib LineJoinStyle.Round = 1)
          });
        } catch (svgErr) {
          // Fallback: draw as individual line segments if SVG path fails
          console.warn('SVG path draw failed, falling back to segments:', svgErr);
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

function wrapText(text, font, fontSize, maxWidth) {
  if (!text) return [];
  const lines = text.split('\n');
  const resultLines = [];

  for (const line of lines) {
    if (!line || line.trim() === '') {
      resultLines.push('');
      continue;
    }
    const words = line.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      let width = 0;
      try {
        if (font && font.widthOfTextAtSize) {
          width = font.widthOfTextAtSize(testLine, fontSize);
        } else {
          width = testLine.length * (fontSize * 0.5);
        }
      } catch (e) {
        width = testLine.length * (fontSize * 0.5);
      }

      if (width <= maxWidth || !currentLine) {
        currentLine = testLine;
      } else {
        resultLines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      resultLines.push(currentLine);
    }
  }
  return resultLines;
}
