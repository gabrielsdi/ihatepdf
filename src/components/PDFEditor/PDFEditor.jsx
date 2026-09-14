import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Type, Image as ImageIcon, Edit2, Square, Hand, Bold, Italic,
  Trash2, Move, ChevronUp, ChevronDown, Plus, Minus, Info, ArrowRight, Loader2, AlignLeft, AlignCenter, AlignRight, Copy
} from 'lucide-react';
import { extractPdfPages, exportPdfWithLayers } from '../../utils/pdfUtils';
import './PDFEditor.css';

export default function PDFEditor({ file, onReset }) {
  const [loading, setLoading] = useState(true);
  const [pagesData, setPagesData] = useState([]);
  const [activePage, setActivePage] = useState(1);

  // Internal Zoom scale starts at 200% (displayed as "100%")
  const [zoom, setZoom] = useState(200);
  const [toolMode, setToolMode] = useState('select');

  // Layers state
  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [editingLayerId, setEditingLayerId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [draggedLayerId, setDraggedLayerId] = useState(null);

  // Clipboard for Copy/Paste
  const copiedLayerRef = useRef(null);

  // Dragging & Resizing State
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

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
  // Map of layerId -> textarea DOM node, for measuring scrollHeight after resize
  const layerTextareaRefs = useRef({});

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
          setZoom(200);
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

  // Focus textarea when entering edit mode & auto-adjust height/width
  useEffect(() => {
    if (editingLayerId && textareaRef.current) {
      textareaRef.current.focus();
      // Auto-adjust height to scrollHeight
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editingLayerId]);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // --------------------------------------------------------------------------
  // COPY & PASTE SHORTCUTS
  // --------------------------------------------------------------------------
  const handleCopySelectedLayer = useCallback(() => {
    if (!selectedLayer) return;
    copiedLayerRef.current = { ...selectedLayer };
  }, [selectedLayer]);

  const handlePasteLayer = useCallback(() => {
    if (!copiedLayerRef.current) return;
    const src = copiedLayerRef.current;
    const newId = `layer_${Date.now()}`;

    const pastedLayer = {
      ...src,
      id: newId,
      pageNum: activePage,
      x: src.x + 20,
      y: src.y + 20,
    };

    setLayers(prev => [...prev, pastedLayer]);
    setSelectedLayerId(newId);
    setEditingLayerId(null);
  }, [activePage]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const activeTag = document.activeElement?.tagName?.toLowerCase();

      if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
        if (selectedLayer && activeTag !== 'textarea' && activeTag !== 'input') {
          e.preventDefault();
          handleCopySelectedLayer();
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'v') {
        if (copiedLayerRef.current && activeTag !== 'textarea' && activeTag !== 'input') {
          e.preventDefault();
          handlePasteLayer();
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerId) {
        if (activeTag !== 'textarea' && activeTag !== 'input' && !editingLayerId) {
          e.preventDefault();
          handleDeleteSelectedLayer();
        }
      } else if (e.key === 'Escape') {
        setSelectedLayerId(null);
        setEditingLayerId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayer, selectedLayerId, editingLayerId, handleCopySelectedLayer, handlePasteLayer]);

  // 1. ADD TEXT LAYER (Auto-adjusting width & height, 36px font, non-bold)
  const handleAddTextLayer = () => {
    const pageLayers = layers.filter(l => l.pageNum === activePage);
    const count = pageLayers.length + 1;
    const newId = `layer_${Date.now()}`;

    const newLayer = {
      id: newId,
      pageNum: activePage,
      type: 'text',
      text: `Your text here ${count}`,
      x: 100,
      y: 100 + (count * 30),
      width: null, // null means AUTO-FIT width to text content!
      height: null, // null means AUTO-FIT height to text content!
      fontSize: 24,
      fontFamily: 'Arial',
      isBold: false,
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
        x: 120,
        y: 120,
        width: 240,
        height: 180,
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
      x: 140,
      y: 140,
      width: 260,
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
    setShowDeleteModal(true);
  };

  const confirmDeleteAllLayers = () => {
    setLayers(prev => prev.filter(l => l.pageNum !== activePage));
    setSelectedLayerId(null);
    setEditingLayerId(null);
    setShowDeleteModal(false);
  };

  // Layer Reordering Handlers (Forward = Top of Stack, Backward = Bottom of Stack)
  const moveLayerForward = (layerId, e) => {
    if (e) e.stopPropagation();
    const idx = layers.findIndex(l => l.id === layerId);
    if (idx < 0 || idx >= layers.length - 1) return;
    setLayers(prev => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx + 1];
      next[idx + 1] = temp;
      return next;
    });
  };

  const moveLayerBackward = (layerId, e) => {
    if (e) e.stopPropagation();
    const idx = layers.findIndex(l => l.id === layerId);
    if (idx <= 0) return;
    setLayers(prev => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[idx - 1];
      next[idx - 1] = temp;
      return next;
    });
  };

  // --------------------------------------------------------------------------
  // MOUSE DRAGGING & RESIZING HANDLERS
  // --------------------------------------------------------------------------
  const handleLayerMouseDown = (e, layer) => {
    e.stopPropagation();

    if (editingLayerId === layer.id) return;
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
      setIsDragging(false);
    }
  };

  const handleResizeHandleMouseDown = (e, layer, handleType) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedLayerId(layer.id);
    setEditingLayerId(null);
    setIsResizing(true);
    setResizeHandle(handleType);

    const bounds = e.currentTarget.parentElement.parentElement.getBoundingClientRect();
    const scale = zoom / 100;

    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: layer.width || (bounds.width / scale),
      height: layer.height || (bounds.height / scale),
    });
  };

  // ---------------------------------------------------------------------------
  // SNAP TEXT LAYER to tightly fit its content (used after resize + on deselect)
  // ---------------------------------------------------------------------------
  const snapTextLayerToContent = (layer) => {
    if (!layer || layer.type !== 'text') return;
    const taEl = layerTextareaRefs.current[layer.id];
    if (!taEl) return;

    const fs = layer.fontSize || 24;
    const ff = layer.fontFamily || 'Arial';
    const fw = layer.isBold ? 'bold' : 'normal';
    const fi = layer.isItalic ? 'italic' : 'normal';
    const text = layer.text || ' ';

    const baseStyles = [
      'position:fixed', 'visibility:hidden', 'pointer-events:none',
      'top:-9999px', 'left:-9999px',
      `font-size:${fs}px`, `font-family:${ff}`,
      `font-weight:${fw}`, `font-style:${fi}`,
      'line-height:1.15', 'padding:2px 4px', 'box-sizing:border-box',
    ];

    // 1. Natural (single-line) width
    const widthProbe = document.createElement('div');
    widthProbe.style.cssText = [...baseStyles, 'white-space:pre'].join(';');
    const longestLine = text.split('\n').reduce((a, b) => b.length > a.length ? b : a, '');
    widthProbe.textContent = longestLine || ' ';
    document.body.appendChild(widthProbe);
    const naturalWidth = Math.ceil(widthProbe.getBoundingClientRect().width) + 4;
    document.body.removeChild(widthProbe);

    // 2. Live container width in document coords (unscaled)
    const scale = zoom / 100;
    const containerEl = taEl.parentElement;
    const liveWidth = containerEl
      ? Math.round(containerEl.getBoundingClientRect().width / scale)
      : (layer.width || naturalWidth);
    const snappedWidth = Math.max(40, Math.min(liveWidth, naturalWidth));

    // 3. Height at snappedWidth
    const heightProbe = document.createElement('div');
    heightProbe.style.cssText = [
      ...baseStyles,
      'white-space:pre-wrap', 'word-break:break-word', 'overflow-wrap:break-word',
      `width:${snappedWidth}px`,
    ].join(';');
    heightProbe.textContent = text;
    document.body.appendChild(heightProbe);
    const snappedHeight = Math.ceil(heightProbe.getBoundingClientRect().height);
    document.body.removeChild(heightProbe);

    // 4. Commit
    setLayers(prev =>
      prev.map(l =>
        l.id === layer.id ? { ...l, width: snappedWidth, height: snappedHeight } : l
      )
    );
  };

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

    if (e.target.classList.contains('editor-canvas-workspace') || e.target.classList.contains('editor-bg-image') || e.target.classList.contains('editor-page-container') || e.target.classList.contains('editor-page-scaler')) {
      // Auto-fit the text layer before deselecting
      if (selectedLayer?.type === 'text') {
        snapTextLayerToContent(selectedLayer);
      }
      setSelectedLayerId(null);
      setEditingLayerId(null);
    }
  };

  const handleGlobalMouseMove = (e) => {
    if (isPanning && workspaceRef.current) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      workspaceRef.current.scrollLeft = panStart.scrollLeft - dx;
      workspaceRef.current.scrollTop = panStart.scrollTop - dy;
      return;
    }

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

    if (editingLayerId || !selectedLayer || (!isDragging && !isResizing) || !canvasRef.current) return;

    const scale = zoom / 100;
    const canvasBounds = canvasRef.current.getBoundingClientRect();

    if (isDragging) {
      const mouseXCanvas = (e.clientX - canvasBounds.left) / scale;
      const mouseYCanvas = (e.clientY - canvasBounds.top) / scale;

      const newX = Math.max(0, mouseXCanvas - dragOffset.x);
      const newY = Math.max(0, mouseYCanvas - dragOffset.y);

      setLayers(prev =>
        prev.map(l => l.id === selectedLayer.id ? { ...l, x: newX, y: newY } : l)
      );
    } else if (isResizing) {
      const dx = (e.clientX - resizeStart.x) / scale;
      const dy = (e.clientY - resizeStart.y) / scale;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;

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

      setLayers(prev =>
        prev.map(l => l.id === selectedLayer.id ? {
          ...l,
          width: newWidth,
          height: newHeight
        } : l)
      );
    }
  };

  const handleGlobalMouseUp = () => {
    const wasResizing = isResizing;
    const resizingLayerId = selectedLayer?.id;
    const resizingLayerType = selectedLayer?.type;
    const resizingLayer = selectedLayer;

    setIsDragging(false);
    setIsResizing(false);
    setIsPanning(false);
    setResizeHandle(null);

    // After resize ends on a text layer: snap BOTH width and height to tightly fit text
    if (wasResizing && resizingLayerType === 'text' && resizingLayerId && resizingLayer) {
      setTimeout(() => snapTextLayerToContent(resizingLayer), 0);
    }


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
      alert('Error saving PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="pdf-editor-loading">
        <Loader2 size={44} className="spinner" />
        <h2>Loading PDF document...</h2>
        <p>Generating crisp full-screen preview...</p>
      </div>
    );
  }

  const currentPageData = pagesData.find(p => p.pageNum === activePage) || pagesData[0];
  const currentPageLayers = layers.filter(l => l.pageNum === activePage);

  const displayZoomPercent = Math.round(zoom / 2);

  return (
    <div
      className="pdf-editor-pro"
      onMouseMove={handleGlobalMouseMove}
      onMouseUp={handleGlobalMouseUp}
      id="pdf-editor-container"
    >
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        onChange={handleImageFileSelect}
        style={{ display: 'none' }}
      />

      {/* 1. TOP FORMATTING TOOLBAR */}
      <div className="editor-top-bar" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
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
              value={selectedLayer?.fontSize || 24}
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
            title="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            className={`editor-icon-btn ${selectedLayer?.isItalic ? 'active' : ''}`}
            onClick={() => updateSelectedLayer('isItalic', !selectedLayer?.isItalic)}
            disabled={!selectedLayer || selectedLayer.type !== 'text'}
            title="Italic"
          >
            <Italic size={16} />
          </button>

          <div className="editor-color-btn-wrapper" title="Element color">
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
            title="White Background (Cover original text)"
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

          {/* Copy Layer Button */}
          <button
            className="editor-icon-btn"
            onClick={handleCopySelectedLayer}
            disabled={!selectedLayer}
            title="Copy layer (Cmd+C)"
          >
            <Copy size={16} />
          </button>

          <div className="editor-divider" />

          <div className="editor-pill-badge">
            {displayZoomPercent}%
          </div>

          <div className="editor-divider" />

          <button
            className="editor-icon-btn editor-trash-btn"
            onClick={handleDeleteSelectedLayer}
            disabled={!selectedLayer}
            title="Delete selected element"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* 2. SECONDARY TOOL STRIP */}
      <div className="editor-tool-strip" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <button
          className={`editor-tool-btn ${toolMode === 'hand' ? 'active' : ''}`}
          onClick={() => setToolMode('hand')}
          title="Hand tool (Pan view)"
        >
          <Hand size={18} />
        </button>

        <button
          className="editor-tool-btn editor-tool-btn--highlight"
          onClick={handleAddTextLayer}
          title="Add Text"
        >
          <span className="editor-text-add-icon">A|</span>
        </button>

        <button
          className="editor-tool-btn"
          onClick={() => imageInputRef.current?.click()}
          title="Add Image"
        >
          <ImageIcon size={18} />
        </button>

        <button
          className={`editor-tool-btn ${toolMode === 'draw' ? 'active' : ''}`}
          onClick={() => setToolMode('draw')}
          title="Freehand draw"
        >
          <Edit2 size={18} />
        </button>

        <button
          className="editor-tool-btn"
          onClick={handleAddShapeLayer}
          title="Add Shape / Rectangle"
        >
          <Square size={18} />
        </button>
      </div>

      {/* 3. MAIN WORKSPACE */}
      <div className="editor-main-workspace">
        {/* Left Thumbnails */}
        <aside className="editor-left-thumbs" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          {pagesData.map((p) => (
            <button
              key={p.pageNum}
              className={`editor-thumb-box ${activePage === p.pageNum ? 'active' : ''}`}
              onClick={() => setActivePage(p.pageNum)}
            >
              <div className="editor-thumb-img-wrap">
                <img src={p.bgImageUrl} alt={`Page ${p.pageNum}`} />
              </div>
              <span className="editor-thumb-num">{p.pageNum}</span>
            </button>
          ))}
        </aside>

        {/* Center Canvas Workspace */}
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
                      width: layer.width ? `${layer.width}px` : 'fit-content',
                      // Text layers: height is auto (driven by textarea scrollHeight)
                      // Image/shape layers: use fixed layer.height
                      height: layer.type === 'text' ? 'auto' : (layer.height ? `${layer.height}px` : 'auto'),
                      minWidth: '60px',
                      minHeight: layer.type === 'text' ? 'unset' : '36px',
                    }}
                    onMouseDown={(e) => handleLayerMouseDown(e, layer)}
                    onDoubleClick={(e) => handleLayerDoubleClick(e, layer)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* TEXT LAYER */}
                    {layer.type === 'text' && (
                      <textarea
                        ref={(el) => {
                          // Track in layerTextareaRefs for resize snapping
                          if (el) layerTextareaRefs.current[layer.id] = el;
                          else delete layerTextareaRefs.current[layer.id];
                          // Also assign to textareaRef when editing
                          if (isEditing) textareaRef.current = el;
                        }}
                        className={`editor-layer-textarea ${isEditing ? 'active-input' : 'readonly-input'}`}
                        value={layer.text}
                        readOnly={!isEditing}
                        onChange={(e) => {
                          const val = e.target.value;
                          // When text changes, auto-grow height and clear fixed height on layer
                          const taEl = layerTextareaRefs.current[layer.id];
                          if (taEl) {
                            taEl.style.height = 'auto';
                            const newH = taEl.scrollHeight;
                            taEl.style.height = `${newH}px`;
                            setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, text: val, height: newH } : l));
                          } else {
                            setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, text: val } : l));
                          }
                        }}
                        style={{
                          fontSize: `${layer.fontSize || 24}px`,
                          fontFamily: layer.fontFamily || 'Arial',
                          fontWeight: layer.isBold ? 'bold' : 'normal',
                          fontStyle: layer.isItalic ? 'italic' : 'normal',
                          color: layer.color || '#000000',
                          backgroundColor: layer.bgColor || 'transparent',
                          textAlign: layer.align || 'left',
                          pointerEvents: isEditing ? 'auto' : 'none',
                          // Height driven by layer.height when set
                          height: layer.height ? `${layer.height}px` : 'auto',
                        }}
                      />
                    )}

                    {/* IMAGE LAYER */}
                    {layer.type === 'image' && (
                      <img
                        src={layer.imageDataUrl}
                        alt="Image layer"
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

                    {/* 8 Blue Control Handles */}
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
          <div className="editor-bottom-controls" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
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
            <button onClick={() => setZoom(prev => Math.max(80, prev - 20))} title="Zoom out">
              <Minus size={14} />
            </button>
            <button onClick={() => setZoom(prev => Math.min(500, prev + 20))} title="Zoom in">
              <Plus size={14} />
            </button>
            <span className="editor-zoom-indicator">{displayZoomPercent}%</span>
          </div>
        </main>

        {/* Right Sidebar ("Edit PDF") */}
        <aside className="editor-right-sidebar" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <div className="editor-sidebar-header">
            <h2>Edit PDF</h2>
          </div>

          <div className="editor-info-banner">
            <Info size={20} className="editor-info-icon" />
            <p>Reorder and position elements on your document.</p>
          </div>

          <div className="editor-layer-section-header">
            <span className="editor-page-label">Page {activePage}</span>
            {currentPageLayers.length > 0 && (
              <button className="editor-clear-all-btn" onClick={handleDeleteAllPageLayers}>
                Delete all
              </button>
            )}
          </div>

          {/* Layer List */}
          <div className="editor-layers-list">
            {currentPageLayers.length === 0 ? (
              <div className="editor-layers-empty">
                Click the <strong>A|</strong> or <strong>🖼️</strong> buttons above to add layers.
              </div>
            ) : (
              // Display layers top-to-bottom (reversed visual stack)
              [...currentPageLayers].reverse().map((layer) => {
                const isSelected = selectedLayerId === layer.id;
                const defaultName = layer.type === 'text' ? layer.text : `${layer.type.toUpperCase()} Element`;

                return (
                  <div
                    key={layer.id}
                    className={`editor-layer-item ${isSelected ? 'selected' : ''}`}
                    draggable
                    onDragStart={(e) => {
                      setDraggedLayerId(layer.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!draggedLayerId || draggedLayerId === layer.id) return;
                      const fromIdx = layers.findIndex(l => l.id === draggedLayerId);
                      const toIdx = layers.findIndex(l => l.id === layer.id);
                      if (fromIdx < 0 || toIdx < 0) return;
                      setLayers(prev => {
                        const next = [...prev];
                        const [moved] = next.splice(fromIdx, 1);
                        next.splice(toIdx, 0, moved);
                        return next;
                      });
                    }}
                    onDragEnd={() => setDraggedLayerId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedLayerId(layer.id);
                      setEditingLayerId(null);
                    }}
                  >
                    <div className="editor-layer-item-left">
                      <Move size={14} className="editor-layer-drag-handle" title="Drag to reorder" />
                      <div className="editor-layer-icon">
                        {layer.type === 'text' && 'A'}
                        {layer.type === 'image' && '🖼️'}
                        {layer.type === 'shape' && '⬜'}
                        {layer.type === 'draw' && '✏️'}
                      </div>
                      <input
                        type="text"
                        className="editor-layer-title-input"
                        value={layer.name !== undefined ? layer.name : defaultName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, name: val } : l));
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <div className="editor-layer-item-actions">
                      <button
                        onClick={(e) => moveLayerForward(layer.id, e)}
                        title="Bring forward (Up)"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={(e) => moveLayerBackward(layer.id, e)}
                        title="Send backward (Down)"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopySelectedLayer();
                        }}
                        title="Copy layer"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        className="editor-layer-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLayers(prev => prev.filter(l => l.id !== layer.id));
                          if (selectedLayerId === layer.id) setSelectedLayerId(null);
                        }}
                        title="Delete element"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Save Changes Button */}
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
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Save changes</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </aside>
      </div>

      {/* STYLED DELETE ALL MODAL */}
      {showDeleteModal && (
        <div className="editor-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="editor-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="editor-modal-header">
              <div className="editor-modal-icon">
                <Trash2 size={22} />
              </div>
              <h3>Delete All Elements?</h3>
            </div>
            <p className="editor-modal-body">
              Are you sure you want to delete all added elements on <strong>Page {activePage}</strong>? This action cannot be undone.
            </p>
            <div className="editor-modal-actions">
              <button
                className="editor-modal-btn editor-modal-btn--secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="editor-modal-btn editor-modal-btn--danger"
                onClick={confirmDeleteAllLayers}
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
