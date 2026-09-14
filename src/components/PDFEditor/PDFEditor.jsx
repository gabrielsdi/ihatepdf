import { useState, useEffect, useRef } from 'react';
import {
  Type, Image as ImageIcon, Edit2, Square, Hand, Bold, Italic, Underline,
  Trash2, Move, ChevronUp, ChevronDown, Plus, Minus, Info, ArrowRight, Loader2, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { extractPdfPages, exportPdfWithLayers } from '../../utils/pdfUtils';
import './PDFEditor.css';

export default function PDFEditor({ file, onReset }) {
  const [loading, setLoading] = useState(true);
  const [pagesData, setPagesData] = useState([]);
  const [activePage, setActivePage] = useState(1);
  const [zoom, setZoom] = useState(85);
  const [toolMode, setToolMode] = useState('edit');

  // Layers state (starts clean, empty by default)
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);

  // Dragging & Resizing State
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, fontSize: 16 });

  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef(null);

  // Load PDF pages on mount
  useEffect(() => {
    let isMounted = true;
    async function loadPdf() {
      try {
        setLoading(true);
        const pages = await extractPdfPages(file);
        if (isMounted) {
          setPagesData(pages);
          setLayers([]); // Start clean without overlapping text
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        if (isMounted) setLoading(false);
      }
    }
    loadPdf();
    return () => { isMounted = false; };
  }, [file]);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // Add new text layer (like "Tu texto aquí 1" in screenshot)
  const handleAddTextLayer = () => {
    const pageLayers = layers.filter(l => l.pageNum === activePage);
    const count = pageLayers.length + 1;
    const newId = `layer_${Date.now()}`;

    const newLayer = {
      id: newId,
      pageNum: activePage,
      type: 'text',
      text: `Tu texto aquí ${count}`,
      x: 180,
      y: 180 + (count * 25),
      width: 280,
      height: 60,
      fontSize: 32,
      fontFamily: 'Arial',
      isBold: true,
      isItalic: false,
      color: '#000000',
      bgColor: 'transparent', // Can be '#ffffff' to cover original text
      align: 'left',
    };

    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newId);
  };

  // Update selected layer property
  const updateSelectedLayer = (prop, value) => {
    if (!selectedLayerId) return;
    setLayers(prev =>
      prev.map(l => l.id === selectedLayerId ? { ...l, [prop]: value } : l)
    );
  };

  // Delete selected layer
  const handleDeleteSelectedLayer = () => {
    if (!selectedLayerId) return;
    setLayers(prev => prev.filter(l => l.id !== selectedLayerId));
    setSelectedLayerId(null);
  };

  // Delete all layers for current page
  const handleDeleteAllPageLayers = () => {
    if (layers.filter(l => l.pageNum === activePage).length === 0) return;
    if (!window.confirm('¿Eliminar todos los elementos añadidos en la página actual?')) return;
    setLayers(prev => prev.filter(l => l.pageNum !== activePage));
    setSelectedLayerId(null);
  };

  // Dragging logic
  const handleMouseDown = (e, layer, handleType = null) => {
    e.stopPropagation();
    setSelectedLayerId(layer.id);

    if (handleType) {
      setIsResizing(true);
      setResizeHandle(handleType);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: layer.width || 200,
        height: layer.height || 50,
        fontSize: layer.fontSize || 16,
      });
    } else {
      setIsDragging(true);
      const bounds = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!selectedLayer || (!isDragging && !isResizing)) return;

    if (canvasRef.current) {
      const canvasBounds = canvasRef.current.getBoundingClientRect();

      if (isDragging) {
        const newX = (e.clientX - canvasBounds.left - dragOffset.x) / (zoom / 100);
        const newY = (e.clientY - canvasBounds.top - dragOffset.y) / (zoom / 100);

        setLayers(prev =>
          prev.map(l => l.id === selectedLayer.id ? { ...l, x: Math.max(0, newX), y: Math.max(0, newY) } : l)
        );
      } else if (isResizing) {
        const dx = (e.clientX - resizeStart.x) / (zoom / 100);
        const dy = (e.clientY - resizeStart.y) / (zoom / 100);

        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newFontSize = resizeStart.fontSize;

        if (resizeHandle.includes('r')) newWidth = Math.max(60, resizeStart.width + dx);
        if (resizeHandle.includes('b')) newHeight = Math.max(30, resizeStart.height + dy);

        if (resizeHandle === 'se' || resizeHandle === 'sw') {
          const scale = newWidth / resizeStart.width;
          newFontSize = Math.max(10, Math.min(120, Math.round(resizeStart.fontSize * scale)));
        }

        setLayers(prev =>
          prev.map(l => l.id === selectedLayer.id ? { ...l, width: newWidth, height: newHeight, fontSize: newFontSize } : l)
        );
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  // Export PDF
  const handleExport = async () => {
    try {
      setExporting(true);
      await exportPdfWithLayers(file, pagesData, layers);
    } catch (err) {
      console.error('Error saving PDF:', err);
      alert('Error al guardar el PDF. Inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="pdf-editor-loading">
        <Loader2 size={44} className="spinner" />
        <h2>Cargando documento PDF...</h2>
        <p>Generando vista previa nítida y limpia...</p>
      </div>
    );
  }

  const currentPageData = pagesData.find(p => p.pageNum === activePage) || pagesData[0];
  const currentPageLayers = layers.filter(l => l.pageNum === activePage);

  return (
    <div
      className="pdf-editor-pro"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      id="pdf-editor-container"
    >
      {/* 1. TOP FORMATTING TOOLBAR */}
      <div className="editor-top-bar">
        <div className="editor-top-bar__formatting">
          {/* Font Family */}
          <select
            className="editor-select editor-font-select"
            value={selectedLayer?.fontFamily || 'Arial'}
            onChange={(e) => updateSelectedLayer('fontFamily', e.target.value)}
            disabled={!selectedLayer}
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
          </select>

          {/* Font Size */}
          <div className="editor-size-wrapper">
            <span className="editor-size-icon">T</span>
            <select
              className="editor-select editor-size-select"
              value={selectedLayer?.fontSize || 36}
              onChange={(e) => updateSelectedLayer('fontSize', parseInt(e.target.value))}
              disabled={!selectedLayer}
            >
              {[12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 54, 64, 72].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="editor-divider" />

          {/* Bold, Italic, Underline */}
          <button
            className={`editor-icon-btn ${selectedLayer?.isBold ? 'active' : ''}`}
            onClick={() => updateSelectedLayer('isBold', !selectedLayer?.isBold)}
            disabled={!selectedLayer}
            title="Negrita"
          >
            <Bold size={16} />
          </button>
          <button
            className={`editor-icon-btn ${selectedLayer?.isItalic ? 'active' : ''}`}
            onClick={() => updateSelectedLayer('isItalic', !selectedLayer?.isItalic)}
            disabled={!selectedLayer}
            title="Cursiva"
          >
            <Italic size={16} />
          </button>

          {/* Text Color Picker */}
          <div className="editor-color-btn-wrapper" title="Color de texto">
            <span className="editor-color-label" style={{ color: selectedLayer?.color || '#000' }}>A</span>
            <input
              type="color"
              className="editor-color-input"
              value={selectedLayer?.color || '#000000'}
              onChange={(e) => updateSelectedLayer('color', e.target.value)}
              disabled={!selectedLayer}
            />
          </div>

          {/* Cover background box toggle (White box to replace existing PDF text) */}
          <button
            className={`editor-icon-btn ${selectedLayer?.bgColor === '#ffffff' ? 'active' : ''}`}
            onClick={() => updateSelectedLayer('bgColor', selectedLayer?.bgColor === '#ffffff' ? 'transparent' : '#ffffff')}
            disabled={!selectedLayer}
            title="Fondo Blanco (Tapar texto original)"
          >
            <Square size={16} style={{ fill: selectedLayer?.bgColor === '#ffffff' ? '#ffffff' : 'transparent' }} />
          </button>

          <div className="editor-divider" />

          {/* Alignment */}
          <button
            className={`editor-icon-btn ${selectedLayer?.align === 'left' ? 'active' : ''}`}
            onClick={() => updateSelectedLayer('align', 'left')}
            disabled={!selectedLayer}
          >
            <AlignLeft size={16} />
          </button>
          <button
            className={`editor-icon-btn ${selectedLayer?.align === 'center' ? 'active' : ''}`}
            onClick={() => updateSelectedLayer('align', 'center')}
            disabled={!selectedLayer}
          >
            <AlignCenter size={16} />
          </button>
          <button
            className={`editor-icon-btn ${selectedLayer?.align === 'right' ? 'active' : ''}`}
            onClick={() => updateSelectedLayer('align', 'right')}
            disabled={!selectedLayer}
          >
            <AlignRight size={16} />
          </button>

          <div className="editor-divider" />

          <div className="editor-pill-badge">
            {zoom}%
          </div>

          <div className="editor-divider" />

          {/* Trash button */}
          <button
            className="editor-icon-btn editor-trash-btn"
            onClick={handleDeleteSelectedLayer}
            disabled={!selectedLayer}
            title="Eliminar elemento seleccionado"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* 2. SECONDARY TOOL STRIP */}
      <div className="editor-tool-strip">
        <div className="editor-mode-pill">
          <button
            className={`editor-mode-tab ${toolMode === 'annotate' ? 'active' : ''}`}
            onClick={() => setToolMode('annotate')}
          >
            <Edit2 size={14} />
            <span>Anotar</span>
          </button>
          <button
            className={`editor-mode-tab ${toolMode === 'edit' ? 'active' : ''}`}
            onClick={() => setToolMode('edit')}
          >
            <Type size={14} />
            <span>Editar</span>
            <span className="editor-crown-icon">👑</span>
          </button>
        </div>

        <div className="editor-divider-vertical" />

        <button className="editor-tool-btn" title="Mover / Seleccionar">
          <Hand size={18} />
        </button>

        {/* Big Add Text Button */}
        <button
          className="editor-tool-btn editor-tool-btn--highlight"
          onClick={handleAddTextLayer}
          title="Añadir Texto"
        >
          <span className="editor-text-add-icon">A|</span>
        </button>

        <button className="editor-tool-btn" title="Añadir Imagen" onClick={handleAddTextLayer}>
          <ImageIcon size={18} />
        </button>

        <button className="editor-tool-btn" title="Dibujar libremente">
          <Edit2 size={18} />
        </button>

        <button className="editor-tool-btn" title="Añadir Formas">
          <Square size={18} />
        </button>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div className="editor-main-workspace">
        {/* Left Thumbnails */}
        <aside className="editor-left-thumbs">
          {pagesData.map((p) => (
            <button
              key={p.pageNum}
              className={`editor-thumb-box ${activePage === p.pageNum ? 'active' : ''}`}
              onClick={() => setActivePage(p.pageNum)}
            >
              <div className="editor-thumb-img-wrap">
                <img src={p.bgImageUrl} alt={`Página ${p.pageNum}`} />
              </div>
              <span className="editor-thumb-num">{p.pageNum}</span>
            </button>
          ))}
        </aside>

        {/* Center Canvas Workspace */}
        <main
          className="editor-canvas-workspace"
          onClick={() => setSelectedLayerId(null)}
        >
          <div
            ref={canvasRef}
            className="editor-page-container"
            style={{
              width: `${(currentPageData?.width || 800) * (zoom / 100)}px`,
              height: `${(currentPageData?.height || 1100) * (zoom / 100)}px`,
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
            }}
          >
            {/* CLEAN PDF Page Background Image */}
            <img
              src={currentPageData?.bgImageUrl}
              alt={`Página ${currentPageData?.pageNum}`}
              className="editor-bg-image"
            />

            {/* User Added Interactive Layers */}
            {currentPageLayers.map((layer) => {
              const isSelected = selectedLayerId === layer.id;

              return (
                <div
                  key={layer.id}
                  className={`editor-text-layer ${isSelected ? 'selected' : ''}`}
                  style={{
                    left: `${layer.x}px`,
                    top: `${layer.y}px`,
                    width: layer.width ? `${layer.width}px` : 'auto',
                    height: layer.height ? `${layer.height}px` : 'auto',
                    fontSize: `${layer.fontSize}px`,
                    fontFamily: layer.fontFamily || 'Arial',
                    fontWeight: layer.isBold ? 'bold' : 'normal',
                    fontStyle: layer.isItalic ? 'italic' : 'normal',
                    color: layer.color || '#000000',
                    backgroundColor: layer.bgColor || 'transparent',
                    textAlign: layer.align || 'left',
                  }}
                  onMouseDown={(e) => handleMouseDown(e, layer)}
                >
                  <textarea
                    className="editor-layer-textarea"
                    value={layer.text}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, text: val } : l));
                    }}
                    style={{
                      fontSize: 'inherit',
                      fontFamily: 'inherit',
                      fontWeight: 'inherit',
                      fontStyle: 'inherit',
                      color: 'inherit',
                      textAlign: 'inherit',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />

                  {/* 8 Blue Resize Handles */}
                  {isSelected && (
                    <div className="editor-resize-handles">
                      <div className="handle handle-nw" onMouseDown={(e) => handleMouseDown(e, layer, 'nw')} />
                      <div className="handle handle-n"  onMouseDown={(e) => handleMouseDown(e, layer, 'n')} />
                      <div className="handle handle-ne" onMouseDown={(e) => handleMouseDown(e, layer, 'ne')} />
                      <div className="handle handle-e"  onMouseDown={(e) => handleMouseDown(e, layer, 'e')} />
                      <div className="handle handle-se" onMouseDown={(e) => handleMouseDown(e, layer, 'se')} />
                      <div className="handle handle-s"  onMouseDown={(e) => handleMouseDown(e, layer, 's')} />
                      <div className="handle handle-sw" onMouseDown={(e) => handleMouseDown(e, layer, 'sw')} />
                      <div className="handle handle-w"  onMouseDown={(e) => handleMouseDown(e, layer, 'w')} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating Bottom Page Controls */}
          <div className="editor-bottom-controls">
            <button
              onClick={() => setActivePage(prev => Math.max(1, prev - 1))}
              disabled={activePage <= 1}
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={() => setActivePage(prev => Math.min(pagesData.length, prev + 1))}
              disabled={activePage >= pagesData.length}
            >
              <ChevronDown size={16} />
            </button>
            <span className="editor-page-indicator">{activePage} / {pagesData.length}</span>
            <div className="editor-divider-small" />
            <button onClick={() => setZoom(prev => Math.max(40, prev - 10))} title="Alejar">
              <Minus size={14} />
            </button>
            <button onClick={() => setZoom(prev => Math.min(150, prev + 10))} title="Acercar">
              <Plus size={14} />
            </button>
            <span className="editor-zoom-indicator">{zoom}%</span>
          </div>
        </main>

        {/* Right Sidebar ("Editar PDF") */}
        <aside className="editor-right-sidebar">
          <div className="editor-sidebar-header">
            <h2>Editar PDF</h2>
          </div>

          <div className="editor-info-banner">
            <Info size={20} className="editor-info-icon" />
            <p>Reordena los elementos y muévelos delante o detrás del documento.</p>
          </div>

          <div className="editor-layer-section-header">
            <span className="editor-page-label">Página {activePage}</span>
            {currentPageLayers.length > 0 && (
              <button className="editor-clear-all-btn" onClick={handleDeleteAllPageLayers}>
                Eliminar todos
              </button>
            )}
          </div>

          {/* Layer List */}
          <div className="editor-layers-list">
            {currentPageLayers.length === 0 ? (
              <div className="editor-layers-empty">
                Haz clic en el botón <strong>A|</strong> superior para añadir tu primer texto a la página.
              </div>
            ) : (
              currentPageLayers.map((layer) => {
                const isSelected = selectedLayerId === layer.id;

                return (
                  <div
                    key={layer.id}
                    className={`editor-layer-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedLayerId(layer.id)}
                  >
                    <div className="editor-layer-item-left">
                      <Move size={14} className="editor-layer-drag-handle" />
                      <div className="editor-layer-icon">A</div>
                      <input
                        type="text"
                        className="editor-layer-title-input"
                        value={layer.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, text: val } : l));
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div className="editor-layer-item-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLayerId(layer.id);
                        }}
                        title="Editar elemento"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLayers(prev => prev.filter(l => l.id !== layer.id));
                          if (selectedLayerId === layer.id) setSelectedLayerId(null);
                        }}
                        title="Eliminar elemento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Guardar Cambios Button */}
          <div className="editor-sidebar-footer">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="editor-save-changes-btn"
              id="save-pdf-changes-btn"
            >
              {exporting ? (
                <>
                  <Loader2 size={20} className="spinner" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Guardar cambios</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
