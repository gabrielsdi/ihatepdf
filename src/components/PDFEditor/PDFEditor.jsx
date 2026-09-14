import { useState, useEffect, useRef } from 'react';
import {
  Type, Image as ImageIcon, Edit2, Square, Hand, Bold, Italic,
  Trash2, Move, ChevronUp, ChevronDown, Plus, Minus, Info, ArrowRight, Loader2, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { extractPdfPages, exportPdfWithLayers } from '../../utils/pdfUtils';
import './PDFEditor.css';

export default function PDFEditor({ file, onReset }) {
  const [loading, setLoading] = useState(true);
  const [pagesData, setPagesData] = useState([]);
  const [activePage, setActivePage] = useState(1);
  const [zoom, setZoom] = useState(130); // Higher scale so PDF occupies full vertical/horizontal space
  const [toolMode, setToolMode] = useState('select'); // 'select', 'hand', 'draw'

  // Layers state
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [editingLayerId, setEditingLayerId] = useState(null); // Track double-clicked editing state

  // Dragging & Resizing State
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, fontSize: 16 });

  // Pan / Hand tool state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // Freehand Draw state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState([]);

  const [exporting, setExporting] = useState(false);
  const workspaceRef = useRef(null);
  const canvasRef = useRef(null);
  const imageInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Load PDF pages on mount
  useEffect(() => {
    let isMounted = true;
    async function loadPdf() {
      try {
        setLoading(true);
        const pages = await extractPdfPages(file);
        if (isMounted) {
          setPagesData(pages);
          setLayers([]);
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

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (editingLayerId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingLayerId]);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // 1. ADD TEXT LAYER
  const handleAddTextLayer = () => {
    const pageLayers = layers.filter(l => l.pageNum === activePage);
    const count = pageLayers.length + 1;
    const newId = `layer_${Date.now()}`;

    const newLayer = {
      id: newId,
      pageNum: activePage,
      type: 'text',
      text: `Tu texto aquí ${count}`,
      x: 120,
      y: 120 + (count * 30),
      width: 320,
      height: 70,
      fontSize: 32,
      fontFamily: 'Arial',
      isBold: true,
      isItalic: false,
      color: '#000000',
      bgColor: 'transparent',
      align: 'left',
    };

    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newId);
    setEditingLayerId(null);
    setToolMode('select');
  };

  // 2. ADD IMAGE LAYER
  const handleImageFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageDataUrl = event.target.result;
      const newId = `image_${Date.now()}`;

      const newLayer = {
        id: newId,
        pageNum: activePage,
        type: 'image',
        imageDataUrl,
        x: 140,
        y: 140,
        width: 220,
        height: 160,
      };

      setLayers(prev => [...prev, newLayer]);
      setSelectedLayerId(newId);
      setEditingLayerId(null);
      setToolMode('select');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 3. ADD SHAPE LAYER
  const handleAddShapeLayer = () => {
    const newId = `shape_${Date.now()}`;
    const newLayer = {
      id: newId,
      pageNum: activePage,
      type: 'shape',
      shapeType: 'rect',
      x: 160,
      y: 160,
      width: 240,
      height: 140,
      color: '#e8003d',
      bgColor: 'transparent',
    };

    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newId);
    setEditingLayerId(null);
    setToolMode('select');
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
    setEditingLayerId(null);
  };

  // Delete all layers for current page
  const handleDeleteAllPageLayers = () => {
    if (layers.filter(l => l.pageNum === activePage).length === 0) return;
    if (!window.confirm('¿Eliminar todos los elementos añadidos en la página actual?')) return;
    setLayers(prev => prev.filter(l => l.pageNum !== activePage));
    setSelectedLayerId(null);
    setEditingLayerId(null);
  };

  // --------------------------------------------------------------------------
  // MOUSE DRAGGING & RESIZING HANDLERS
  // --------------------------------------------------------------------------
  const handleLayerMouseDown = (e, layer) => {
    e.stopPropagation();

    // IF ACTIVELY EDITING TEXT, DO NOT START DRAGGING (allows natural text highlighting)
    if (editingLayerId === layer.id) {
      return;
    }

    if (toolMode === 'hand' || toolMode === 'draw') return;

    setSelectedLayerId(layer.id);
    setIsDragging(true);

    const scale = zoom / 100;
    const canvasBounds = canvasRef.current.getBoundingClientRect();

    setDragOffset({
      x: (e.clientX - canvasBounds.left) / scale - layer.x,
      y: (e.clientY - canvasBounds.top) / scale - layer.y,
    });
  };

  const handleLayerDoubleClick = (e, layer) => {
    e.stopPropagation();
    if (layer.type === 'text') {
      setSelectedLayerId(layer.id);
      setEditingLayerId(layer.id);
      setIsDragging(false); // Stop dragging when double-clicking to edit
    }
  };

  const handleResizeHandleMouseDown = (e, layer, handleType) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedLayerId(layer.id);
    setEditingLayerId(null); // Exit text editing mode when resizing
    setIsResizing(true);
    setResizeHandle(handleType);

    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: layer.width || 150,
      height: layer.height || 50,
      fontSize: layer.fontSize || 16,
    });
  };

  // Canvas Mouse Down (Deselect when clicking outside on blank canvas)
  const handleCanvasMouseDown = (e) => {
    if (toolMode === 'hand') {
      setIsPanning(true);
      setPanStart({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: workspaceRef.current.scrollLeft,
        scrollTop: workspaceRef.current.scrollTop,
      });
      return;
    }

    if (toolMode === 'draw' && canvasRef.current) {
      setIsDrawing(true);
      const scale = zoom / 100;
      const bounds = canvasRef.current.getBoundingClientRect();
      const pt = {
        x: (e.clientX - bounds.left) / scale,
        y: (e.clientY - bounds.top) / scale,
      };
      setCurrentStroke([pt]);
      return;
    }

    // DESELECT EVERYTHING ON CLICK OUTSIDE
    setSelectedLayerId(null);
    setEditingLayerId(null);
  };

  const handleGlobalMouseMove = (e) => {
    // 1. PAN / HAND TOOL SCROLLING
    if (isPanning && workspaceRef.current) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      workspaceRef.current.scrollLeft = panStart.scrollLeft - dx;
      workspaceRef.current.scrollTop = panStart.scrollTop - dy;
      return;
    }

    // 2. FREEHAND DRAWING
    if (isDrawing && canvasRef.current) {
      const scale = zoom / 100;
      const bounds = canvasRef.current.getBoundingClientRect();
      const pt = {
        x: (e.clientX - bounds.left) / scale,
        y: (e.clientY - bounds.top) / scale,
      };
      setCurrentStroke(prev => [...prev, pt]);
      return;
    }

    // DO NOT DRAG/RESIZE IF USER IS EDITING TEXT INSIDE TEXTAREA
    if (editingLayerId || !selectedLayer || (!isDragging && !isResizing) || !canvasRef.current) return;

    const scale = zoom / 100;
    const canvasBounds = canvasRef.current.getBoundingClientRect();

    // 3. LAYER DRAGGING
    if (isDragging) {
      const mouseXCanvas = (e.clientX - canvasBounds.left) / scale;
      const mouseYCanvas = (e.clientY - canvasBounds.top) / scale;

      const newX = Math.max(0, mouseXCanvas - dragOffset.x);
      const newY = Math.max(0, mouseYCanvas - dragOffset.y);

      setLayers(prev =>
        prev.map(l => l.id === selectedLayer.id ? { ...l, x: newX, y: newY } : l)
      );
    }

    // 4. LAYER RESIZING
    else if (isResizing) {
      const dx = (e.clientX - resizeStart.x) / scale;
      const dy = (e.clientY - resizeStart.y) / scale;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newFontSize = resizeStart.fontSize;

      if (resizeHandle.includes('e')) newWidth = Math.max(40, resizeStart.width + dx);
      if (resizeHandle.includes('s')) newHeight = Math.max(20, resizeStart.height + dy);
      if (resizeHandle.includes('w')) {
        const potentialW = resizeStart.width - dx;
        if (potentialW > 40) newWidth = potentialW;
      }
      if (resizeHandle.includes('n')) {
        const potentialH = resizeStart.height - dy;
        if (potentialH > 20) newHeight = potentialH;
      }

      if (['se', 'sw', 'ne', 'nw'].includes(resizeHandle)) {
        const scaleFactor = newWidth / resizeStart.width;
        newFontSize = Math.max(10, Math.min(120, Math.round(resizeStart.fontSize * scaleFactor)));
      }

      setLayers(prev =>
        prev.map(l => l.id === selectedLayer.id ? {
          ...l,
          width: newWidth,
          height: newHeight,
          fontSize: newFontSize
        } : l)
      );
    }
  };

  const handleGlobalMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setIsPanning(false);
    setResizeHandle(null);

    if (isDrawing && currentStroke.length > 1) {
      setIsDrawing(false);
      const newId = `draw_${Date.now()}`;
      const newLayer = {
        id: newId,
        pageNum: activePage,
        type: 'draw',
        points: currentStroke,
        color: '#e8003d',
        lineWidth: 4,
      };
      setLayers(prev => [...prev, newLayer]);
      setCurrentStroke([]);
      setToolMode('select');
    }
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
        <p>Generando vista previa nítida a pantalla completa...</p>
      </div>
    );
  }

  const currentPageData = pagesData.find(p => p.pageNum === activePage) || pagesData[0];
  const currentPageLayers = layers.filter(l => l.pageNum === activePage);

  return (
    <div
      className="pdf-editor-pro"
      onMouseMove={handleGlobalMouseMove}
      onMouseUp={handleGlobalMouseUp}
      id="pdf-editor-container"
    >
      {/* Hidden file input for image layer */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        onChange={handleImageFileSelect}
        style={{ display: 'none' }}
      />

      {/* 1. TOP FORMATTING TOOLBAR */}
      <div className="editor-top-bar">
        <div className="editor-top-bar__formatting">
          <select
            className="editor-select editor-font-select"
            value={selectedLayer?.fontFamily || 'Arial'}
            onChange={(e) => updateSelectedLayer('fontFamily', e.target.value)}
            disabled={!selectedLayer || selectedLayer.type !== 'text'}
          >
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
          </select>

          <div className="editor-size-wrapper">
            <span className="editor-size-icon">T</span>
            <select
              className="editor-select editor-size-select"
              value={selectedLayer?.fontSize || 36}
              onChange={(e) => updateSelectedLayer('fontSize', parseInt(e.target.value))}
              disabled={!selectedLayer || selectedLayer.type !== 'text'}
            >
              {[12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 54, 64, 72].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="editor-divider" />

          <button
            className={`editor-icon-btn ${selectedLayer?.isBold ? 'active' : ''}`}
            onClick={() => updateSelectedLayer('isBold', !selectedLayer?.isBold)}
            disabled={!selectedLayer || selectedLayer.type !== 'text'}
            title="Negrita"
          >
            <Bold size={16} />
          </button>
          <button
            className={`editor-icon-btn ${selectedLayer?.isItalic ? 'active' : ''}`}
            onClick={() => updateSelectedLayer('isItalic', !selectedLayer?.isItalic)}
            disabled={!selectedLayer || selectedLayer.type !== 'text'}
            title="Cursiva"
          >
            <Italic size={16} />
          </button>

          <div className="editor-color-btn-wrapper" title="Color de elemento">
            <span className="editor-color-label" style={{ color: selectedLayer?.color || '#000' }}>A</span>
            <input
              type="color"
              className="editor-color-input"
              value={selectedLayer?.color || '#000000'}
              onChange={(e) => updateSelectedLayer('color', e.target.value)}
              disabled={!selectedLayer}
            />
          </div>

          <button
            className={`editor-icon-btn ${selectedLayer?.bgColor === '#ffffff' ? 'active' : ''}`}
            onClick={() => updateSelectedLayer('bgColor', selectedLayer?.bgColor === '#ffffff' ? 'transparent' : '#ffffff')}
            disabled={!selectedLayer}
            title="Fondo Blanco (Tapar texto original)"
          >
            <Square size={16} style={{ fill: selectedLayer?.bgColor === '#ffffff' ? '#ffffff' : 'transparent' }} />
          </button>

          <div className="editor-divider" />

          <button
            className={`editor-icon-btn ${selectedLayer?.align === 'left' ? 'active' : ''}`}
            onClick={() => updateSelectedLayer('align', 'left')}
            disabled={!selectedLayer || selectedLayer.type !== 'text'}
          >
            <AlignLeft size={16} />
          </button>
          <button
            className={`editor-icon-btn ${selectedLayer?.align === 'center' ? 'active' : ''}`}
            onClick={() => updateSelectedLayer('align', 'center')}
            disabled={!selectedLayer || selectedLayer.type !== 'text'}
          >
            <AlignCenter size={16} />
          </button>
          <button
            className={`editor-icon-btn ${selectedLayer?.align === 'right' ? 'active' : ''}`}
            onClick={() => updateSelectedLayer('align', 'right')}
            disabled={!selectedLayer || selectedLayer.type !== 'text'}
          >
            <AlignRight size={16} />
          </button>

          <div className="editor-divider" />

          <div className="editor-pill-badge">
            {zoom}%
          </div>

          <div className="editor-divider" />

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
          <button className="editor-mode-tab active">
            <Type size={14} />
            <span>Editar PDF</span>
            <span className="editor-crown-icon">👑</span>
          </button>
        </div>

        <div className="editor-divider-vertical" />

        <button
          className={`editor-tool-btn ${toolMode === 'hand' ? 'active' : ''}`}
          onClick={() => setToolMode('hand')}
          title="Herramienta Manito (Desplazar vista)"
        >
          <Hand size={18} />
        </button>

        <button
          className="editor-tool-btn editor-tool-btn--highlight"
          onClick={handleAddTextLayer}
          title="Añadir Texto"
        >
          <span className="editor-text-add-icon">A|</span>
        </button>

        <button
          className="editor-tool-btn"
          onClick={() => imageInputRef.current?.click()}
          title="Añadir Imagen"
        >
          <ImageIcon size={18} />
        </button>

        <button
          className={`editor-tool-btn ${toolMode === 'draw' ? 'active' : ''}`}
          onClick={() => setToolMode('draw')}
          title="Dibujar a mano alzada"
        >
          <Edit2 size={18} />
        </button>

        <button
          className="editor-tool-btn"
          onClick={handleAddShapeLayer}
          title="Añadir Forma / Rectángulo"
        >
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

        {/* Center Canvas Workspace (Fills 100% Space) */}
        <main
          ref={workspaceRef}
          className={`editor-canvas-workspace ${toolMode === 'hand' ? 'hand-mode' : ''} ${toolMode === 'draw' ? 'draw-mode' : ''}`}
          onMouseDown={handleCanvasMouseDown}
        >
          <div
            ref={canvasRef}
            className="editor-page-container"
            style={{
              width: `${(currentPageData?.width || 800) * (zoom / 100)}px`,
              height: `${(currentPageData?.height || 1100) * (zoom / 100)}px`,
            }}
          >
            <div
              className="editor-page-scaler"
              style={{
                width: `${currentPageData?.width || 800}px`,
                height: `${currentPageData?.height || 1100}px`,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
              }}
            >
              {/* CLEAN PDF Page Background Image */}
              <img
                src={currentPageData?.bgImageUrl}
                alt={`Página ${currentPageData?.pageNum}`}
                className="editor-bg-image"
              />

              {/* Freehand Drawings SVG overlay */}
              <svg className="editor-draw-svg">
                {currentPageLayers.filter(l => l.type === 'draw').map(l => (
                  <path
                    key={l.id}
                    d={l.points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '')}
                    stroke={l.color || '#e8003d'}
                    strokeWidth={l.lineWidth || 4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

                {isDrawing && currentStroke.length > 1 && (
                  <path
                    d={currentStroke.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '')}
                    stroke="#e8003d"
                    strokeWidth={4}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>

              {/* User Added Interactive Layers */}
              {currentPageLayers.filter(l => l.type !== 'draw').map((layer) => {
                const isSelected = selectedLayerId === layer.id;
                const isEditing = editingLayerId === layer.id;

                return (
                  <div
                    key={layer.id}
                    className={`editor-layer-box ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
                    style={{
                      left: `${layer.x}px`,
                      top: `${layer.y}px`,
                      width: `${layer.width || 150}px`,
                      height: `${layer.height || 50}px`,
                    }}
                    onMouseDown={(e) => handleLayerMouseDown(e, layer)}
                    onDoubleClick={(e) => handleLayerDoubleClick(e, layer)}
                  >
                    {/* TEXT LAYER */}
                    {layer.type === 'text' && (
                      <textarea
                        ref={isEditing ? textareaRef : null}
                        className={`editor-layer-textarea ${isEditing ? 'active-input' : 'readonly-input'}`}
                        value={layer.text}
                        readOnly={!isEditing}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, text: val } : l));
                        }}
                        style={{
                          fontSize: `${layer.fontSize || 32}px`,
                          fontFamily: layer.fontFamily || 'Arial',
                          fontWeight: layer.isBold ? 'bold' : 'normal',
                          fontStyle: layer.isItalic ? 'italic' : 'normal',
                          color: layer.color || '#000000',
                          backgroundColor: layer.bgColor || 'transparent',
                          textAlign: layer.align || 'left',
                          pointerEvents: isEditing ? 'auto' : 'none',
                        }}
                      />
                    )}

                    {/* IMAGE LAYER */}
                    {layer.type === 'image' && (
                      <img
                        src={layer.imageDataUrl}
                        alt="Capa de imagen"
                        className="editor-layer-img"
                        draggable={false}
                      />
                    )}

                    {/* SHAPE LAYER */}
                    {layer.type === 'shape' && (
                      <div
                        className="editor-layer-shape"
                        style={{
                          borderColor: layer.color || '#e8003d',
                          backgroundColor: layer.bgColor || 'transparent',
                        }}
                      />
                    )}

                    {/* 8 Blue Control Handles for Resizing */}
                    {isSelected && !isEditing && (
                      <div className="editor-resize-handles">
                        <div className="handle handle-nw" onMouseDown={(e) => handleResizeHandleMouseDown(e, layer, 'nw')} />
                        <div className="handle handle-n"  onMouseDown={(e) => handleResizeHandleMouseDown(e, layer, 'n')} />
                        <div className="handle handle-ne" onMouseDown={(e) => handleResizeHandleMouseDown(e, layer, 'ne')} />
                        <div className="handle handle-e"  onMouseDown={(e) => handleResizeHandleMouseDown(e, layer, 'e')} />
                        <div className="handle handle-se" onMouseDown={(e) => handleResizeHandleMouseDown(e, layer, 'se')} />
                        <div className="handle handle-s"  onMouseDown={(e) => handleResizeHandleMouseDown(e, layer, 's')} />
                        <div className="handle handle-sw" onMouseDown={(e) => handleResizeHandleMouseDown(e, layer, 'sw')} />
                        <div className="handle handle-w"  onMouseDown={(e) => handleResizeHandleMouseDown(e, layer, 'w')} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating Bottom Navigation Overlay */}
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
            <button onClick={() => setZoom(prev => Math.min(250, prev + 10))} title="Acercar">
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
                Haz clic en el botón <strong>A|</strong> o en <strong>🖼️</strong> superior para añadir capas.
              </div>
            ) : (
              currentPageLayers.map((layer) => {
                const isSelected = selectedLayerId === layer.id;

                return (
                  <div
                    key={layer.id}
                    className={`editor-layer-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedLayerId(layer.id);
                      setEditingLayerId(null);
                    }}
                  >
                    <div className="editor-layer-item-left">
                      <Move size={14} className="editor-layer-drag-handle" />
                      <div className="editor-layer-icon">
                        {layer.type === 'text' && 'A'}
                        {layer.type === 'image' && '🖼️'}
                        {layer.type === 'shape' && '⬜'}
                        {layer.type === 'draw' && '✏️'}
                      </div>
                      <input
                        type="text"
                        className="editor-layer-title-input"
                        value={layer.type === 'text' ? layer.text : `${layer.type.toUpperCase()} Elemento`}
                        onChange={(e) => {
                          if (layer.type === 'text') {
                            const val = e.target.value;
                            setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, text: val } : l));
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div className="editor-layer-item-actions">
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
