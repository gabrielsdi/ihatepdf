import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, X } from 'lucide-react';
import Toolbar from '../Toolbar/Toolbar';
import { exportPdfWithAnnotations } from '../../utils/pdfUtils';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './PDFEditor.css';

// Set pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PDFEditor({ file, onClose }) {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [tool, setTool] = useState('hand');
  const [isDrawing, setIsDrawing] = useState(false);
  const [annotations, setAnnotations] = useState({}); // { pageNum: [annotation, ...] }
  const [textInput, setTextInput] = useState(null);
  const [textValue, setTextValue] = useState('');
  const [toolOptions, setToolOptions] = useState({
    color: '#ff0000',
    fontSize: 16,
    lineWidth: 3,
    shape: 'rect',
  });
  const [exporting, setExporting] = useState(false);

  const canvasRef = useRef({});
  const ctxRef = useRef({});
  const drawStartRef = useRef(null);
  const lastPosRef = useRef(null);
  const pageContainerRef = useRef(null);

  // Initialize canvas for a page
  const initCanvas = useCallback((pageNum, canvas) => {
    if (!canvas) return;
    canvasRef.current[pageNum] = canvas;
    const ctx = canvas.getContext('2d');
    ctxRef.current[pageNum] = ctx;

    // Redraw existing annotations
    const pageAnnotations = annotations[pageNum] || [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pageAnnotations.forEach(ann => drawAnnotation(ctx, ann));
  }, [annotations]);

  const drawAnnotation = (ctx, ann) => {
    ctx.save();
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = ann.lineWidth || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (ann.type) {
      case 'freehand':
        if (ann.points && ann.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          ann.points.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.stroke();
        }
        break;

      case 'text':
        ctx.font = `${ann.fontSize || 16}px Inter, sans-serif`;
        ctx.fillStyle = ann.color;
        ctx.fillText(ann.text, ann.x, ann.y);
        break;

      case 'rect':
        ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
        break;

      case 'circle': {
        const rx = ann.w / 2;
        const ry = ann.h / 2;
        ctx.beginPath();
        ctx.ellipse(ann.x + rx, ann.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'line':
        ctx.beginPath();
        ctx.moveTo(ann.x, ann.y);
        ctx.lineTo(ann.x + ann.w, ann.y + ann.h);
        ctx.stroke();
        break;

      case 'highlight':
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = ann.color;
        ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
        ctx.globalAlpha = 1;
        break;

      default:
        break;
    }
    ctx.restore();
  };

  // Redraw canvas when annotations change
  useEffect(() => {
    Object.entries(canvasRef.current).forEach(([pageNum, canvas]) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      (annotations[pageNum] || []).forEach(ann => drawAnnotation(ctx, ann));
    });
  }, [annotations]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleCanvasMouseDown = useCallback((e, pageNum) => {
    if (tool === 'hand') return;
    e.preventDefault();
    const canvas = canvasRef.current[pageNum];
    if (!canvas) return;
    const pos = getPos(e, canvas);

    if (tool === 'text') {
      setTextInput({ x: e.clientX, y: e.clientY, pageX: pos.x, pageY: pos.y, pageNum });
      setTextValue('');
      return;
    }

    setIsDrawing(true);
    drawStartRef.current = pos;
    lastPosRef.current = pos;

    if (tool === 'freehand') {
      setAnnotations(prev => ({
        ...prev,
        [pageNum]: [...(prev[pageNum] || []), {
          type: 'freehand', points: [pos], color: toolOptions.color, lineWidth: toolOptions.lineWidth,
        }],
      }));
    }
  }, [tool, toolOptions]);

  const handleCanvasMouseMove = useCallback((e, pageNum) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current[pageNum];
    if (!canvas) return;
    const pos = getPos(e, canvas);

    if (tool === 'freehand') {
      setAnnotations(prev => {
        const pageAnns = [...(prev[pageNum] || [])];
        const last = { ...pageAnns[pageAnns.length - 1] };
        last.points = [...last.points, pos];
        pageAnns[pageAnns.length - 1] = last;
        return { ...prev, [pageNum]: pageAnns };
      });
    }

    lastPosRef.current = pos;
  }, [isDrawing, tool]);

  const handleCanvasMouseUp = useCallback((e, pageNum) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    const canvas = canvasRef.current[pageNum];
    if (!canvas) return;
    const pos = getPos(e, canvas);
    const start = drawStartRef.current;

    if (['rect', 'circle', 'line', 'highlight'].includes(tool)) {
      setAnnotations(prev => ({
        ...prev,
        [pageNum]: [...(prev[pageNum] || []), {
          type: tool,
          x: start.x, y: start.y,
          w: pos.x - start.x, h: pos.y - start.y,
          color: toolOptions.color,
          lineWidth: toolOptions.lineWidth,
        }],
      }));
    }
  }, [isDrawing, tool, toolOptions]);

  const handleTextSubmit = useCallback(() => {
    if (!textInput || !textValue.trim()) {
      setTextInput(null);
      return;
    }
    setAnnotations(prev => ({
      ...prev,
      [textInput.pageNum]: [...(prev[textInput.pageNum] || []), {
        type: 'text',
        x: textInput.pageX, y: textInput.pageY,
        text: textValue,
        color: toolOptions.color,
        fontSize: toolOptions.fontSize,
      }],
    }));
    setTextInput(null);
    setTextValue('');
  }, [textInput, textValue, toolOptions]);

  const handleUndo = useCallback(() => {
    setAnnotations(prev => {
      const pageAnns = [...(prev[currentPage] || [])];
      pageAnns.pop();
      return { ...prev, [currentPage]: pageAnns };
    });
  }, [currentPage]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportPdfWithAnnotations(file, annotations, canvasRef.current, numPages);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  }, [file, annotations, numPages]);

  const getCursor = () => {
    const cursors = { hand: 'grab', text: 'text', freehand: 'crosshair', rect: 'crosshair', circle: 'crosshair', line: 'crosshair', highlight: 'crosshair' };
    return cursors[tool] || 'default';
  };

  return (
    <div className="pdf-editor" id="pdf-editor">
      {/* Top bar */}
      <div className="pdf-editor__topbar">
        <div className="pdf-editor__topbar-left">
          <button className="pdf-editor__close-btn" onClick={onClose} id="close-editor-btn" title="Cerrar editor">
            <X size={20} /> Volver
          </button>
          <span className="pdf-editor__filename">{file?.name}</span>
        </div>

        <div className="pdf-editor__topbar-center">
          <button
            className="pdf-editor__nav-btn"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            id="prev-page-btn"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="pdf-editor__page-info">
            Página <strong>{currentPage}</strong> de <strong>{numPages || '?'}</strong>
          </span>
          <button
            className="pdf-editor__nav-btn"
            onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
            disabled={currentPage === numPages}
            id="next-page-btn"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="pdf-editor__topbar-right">
          <button className="pdf-editor__zoom-btn" onClick={() => setScale(s => Math.max(0.5, s - 0.2))} id="zoom-out-btn" title="Alejar">
            <ZoomOut size={18} />
          </button>
          <span className="pdf-editor__zoom-label">{Math.round(scale * 100)}%</span>
          <button className="pdf-editor__zoom-btn" onClick={() => setScale(s => Math.min(3, s + 0.2))} id="zoom-in-btn" title="Acercar">
            <ZoomIn size={18} />
          </button>
          <button
            className={`pdf-editor__export-btn ${exporting ? 'pdf-editor__export-btn--loading' : ''}`}
            onClick={handleExport}
            disabled={exporting}
            id="export-pdf-btn"
          >
            <Download size={18} />
            {exporting ? 'Exportando...' : 'Descargar PDF destruido'}
          </button>
        </div>
      </div>

      {/* Main editor area */}
      <div className="pdf-editor__main">
        {/* Sidebar toolbar */}
        <Toolbar
          tool={tool}
          setTool={setTool}
          toolOptions={toolOptions}
          setToolOptions={setToolOptions}
          onUndo={handleUndo}
          canUndo={(annotations[currentPage] || []).length > 0}
        />

        {/* PDF canvas area */}
        <div className="pdf-editor__canvas-area" ref={pageContainerRef}>
          <Document
            file={file}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={
              <div className="pdf-editor__loading">
                <div className="pdf-editor__loading-skull">💀</div>
                <p>Cargando tu PDF para torturarlo...</p>
              </div>
            }
            error={
              <div className="pdf-editor__error">
                <p>⚠️ Error cargando el PDF. ¿Intentas colarnos algo que no es PDF?</p>
              </div>
            }
          >
            {Array.from({ length: numPages || 0 }, (_, i) => i + 1).map(pageNum => (
              <div
                key={pageNum}
                className={`pdf-editor__page-wrapper ${pageNum === currentPage ? 'pdf-editor__page-wrapper--active' : ''}`}
                style={{ display: pageNum === currentPage ? 'block' : 'none' }}
              >
                <div className="pdf-editor__page-inner" style={{ position: 'relative', display: 'inline-block' }}>
                  <Page
                    pageNumber={pageNum}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={false}
                    onRenderSuccess={(page) => {
                      const canvas = canvasRef.current[pageNum];
                      if (canvas) {
                        canvas.width = page.width * scale;
                        canvas.height = page.height * scale;
                        // Redraw
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        (annotations[pageNum] || []).forEach(ann => drawAnnotation(ctx, ann));
                      }
                    }}
                  />
                  {/* Annotation canvas overlay */}
                  <canvas
                    ref={el => initCanvas(pageNum, el)}
                    className="pdf-editor__annotation-canvas"
                    style={{ cursor: getCursor() }}
                    onMouseDown={e => handleCanvasMouseDown(e, pageNum)}
                    onMouseMove={e => handleCanvasMouseMove(e, pageNum)}
                    onMouseUp={e => handleCanvasMouseUp(e, pageNum)}
                    onMouseLeave={e => handleCanvasMouseUp(e, pageNum)}
                    id={`annotation-canvas-${pageNum}`}
                  />
                </div>
              </div>
            ))}
          </Document>
        </div>
      </div>

      {/* Floating text input */}
      {textInput && (
        <div
          className="pdf-editor__text-input-wrap"
          style={{ top: textInput.y, left: textInput.x }}
          id="text-input-float"
        >
          <input
            autoFocus
            className="pdf-editor__text-input"
            value={textValue}
            onChange={e => setTextValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleTextSubmit(); if (e.key === 'Escape') setTextInput(null); }}
            placeholder="Escribe tu odio aquí..."
            style={{ color: toolOptions.color, fontSize: toolOptions.fontSize }}
            id="text-annotation-input"
          />
          <button className="pdf-editor__text-confirm" onClick={handleTextSubmit} id="confirm-text-btn">✓</button>
          <button className="pdf-editor__text-cancel" onClick={() => setTextInput(null)} id="cancel-text-btn">✕</button>
        </div>
      )}
    </div>
  );
}
