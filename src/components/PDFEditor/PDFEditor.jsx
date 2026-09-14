import { useState, useEffect } from 'react';
import { Download, FileText, RefreshCw, Type, Plus, Trash2, Edit3, Layout, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { extractPdfPages, exportPdfWithTextEdits } from '../../utils/pdfUtils';
import './PDFEditor.css';

export default function PDFEditor({ file, onReset }) {
  const [loading, setLoading] = useState(true);
  const [pagesData, setPagesData] = useState([]);
  const [activePage, setActivePage] = useState(1);
  const [viewMode, setViewMode] = useState('doc'); // 'doc' (Google Drive style) or 'visual' (Page overlay style)
  const [addedBlocks, setAddedBlocks] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadPdf() {
      try {
        setLoading(true);
        const pages = await extractPdfPages(file);
        if (isMounted) {
          setPagesData(pages);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading PDF text:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadPdf();
    return () => { isMounted = false; };
  }, [file]);

  const handleTextChange = (pageNum, itemId, newText) => {
    setPagesData(prevPages =>
      prevPages.map(page => {
        if (page.pageNum !== pageNum) return page;
        return {
          ...page,
          items: page.items.map(item =>
            item.id === itemId ? { ...item, text: newText } : item
          )
        };
      })
    );
  };

  const handleFontSizeChange = (pageNum, itemId, delta) => {
    setPagesData(prevPages =>
      prevPages.map(page => {
        if (page.pageNum !== pageNum) return page;
        return {
          ...page,
          items: page.items.map(item => {
            if (item.id === itemId) {
              const newSize = Math.max(8, Math.min(72, (item.fontSize || 12) + delta));
              return { ...item, fontSize: newSize };
            }
            return item;
          })
        };
      })
    );
  };

  const handleAddCustomBlock = () => {
    const newBlock = {
      id: `custom_${Date.now()}`,
      pageNum: activePage,
      text: 'Nuevo texto añadido...',
      x: 50,
      y: 100 + (addedBlocks.length * 30),
      fontSize: 14,
    };
    setAddedBlocks([...addedBlocks, newBlock]);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportPdfWithTextEdits(file, pagesData, addedBlocks);
      setSuccessMessage('¡PDF editado y descargado con éxito!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Error al exportar el PDF editado. Inténtalo de nuevo.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="pdf-editor-loading">
        <Loader2 size={48} className="spinner" />
        <h2>Convirtiendo PDF a Documento Editable...</h2>
        <p>Extrayendo párrafos, texto y estructura como en Google Drive...</p>
      </div>
    );
  }

  const currentPageData = pagesData.find(p => p.pageNum === activePage) || pagesData[0];

  return (
    <div className="pdf-editor" id="pdf-editor-container">
      {/* Top Editor Toolbar */}
      <header className="pdf-editor__toolbar">
        <div className="pdf-editor__toolbar-left">
          <button onClick={onReset} className="pdf-editor__back-btn" title="Cargar otro archivo">
            <ArrowLeft size={18} />
            <span>Volver</span>
          </button>
          <div className="pdf-editor__file-info">
            <FileText size={18} className="pdf-editor__file-icon" />
            <span className="pdf-editor__filename">{file.name}</span>
            <span className="pdf-editor__page-count">{pagesData.length} págs</span>
          </div>
        </div>

        {/* View Mode Toggle (Doc vs Visual) */}
        <div className="pdf-editor__view-toggle">
          <button
            className={`pdf-editor__toggle-btn ${viewMode === 'doc' ? 'active' : ''}`}
            onClick={() => setViewMode('doc')}
          >
            <Layout size={16} />
            <span>Modo Documento (Google Docs)</span>
          </button>
          <button
            className={`pdf-editor__toggle-btn ${viewMode === 'visual' ? 'active' : ''}`}
            onClick={() => setViewMode('visual')}
          >
            <Edit3 size={16} />
            <span>Modo Edición Visual</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="pdf-editor__toolbar-right">
          <button onClick={handleAddCustomBlock} className="btn-secondary pdf-editor__add-btn">
            <Plus size={16} />
            <span>Añadir Texto</span>
          </button>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-primary pdf-editor__export-btn"
            id="download-edited-pdf-btn"
          >
            {exporting ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Generando PDF...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Descargar PDF Editado</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="pdf-editor__workspace">
        {/* Left Sidebar - Thumbnails */}
        <aside className="pdf-editor__sidebar">
          <h3 className="pdf-editor__sidebar-title">Páginas</h3>
          <div className="pdf-editor__thumbnails">
            {pagesData.map(p => (
              <button
                key={p.pageNum}
                className={`pdf-editor__thumb ${activePage === p.pageNum ? 'pdf-editor__thumb--active' : ''}`}
                onClick={() => setActivePage(p.pageNum)}
              >
                {p.bgImageUrl ? (
                  <img src={p.bgImageUrl} alt={`Página ${p.pageNum}`} />
                ) : (
                  <div className="pdf-editor__thumb-placeholder">{p.pageNum}</div>
                )}
                <span className="pdf-editor__thumb-label">Página {p.pageNum}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Center Content Area */}
        <main className="pdf-editor__content-area">
          {successMessage && (
            <div className="pdf-editor__alert-success">
              <CheckCircle size={20} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* VIEW MODE 1: Google Docs / Drive Document Style */}
          {viewMode === 'doc' && (
            <div className="pdf-editor__doc-view">
              <div className="pdf-editor__doc-sheet">
                <div className="pdf-editor__doc-header">
                  <h2>Página {currentPageData?.pageNum} - Párrafos Editables</h2>
                  <p>Haz clic en cualquier texto para modificarlo directamente como en Word / Google Docs:</p>
                </div>

                <div className="pdf-editor__doc-body">
                  {currentPageData?.items.map((item) => (
                    <div key={item.id} className="pdf-editor__text-item-row">
                      <div className="pdf-editor__text-item-controls">
                        <span className="pdf-editor__text-size-label">{item.fontSize}px</span>
                        <button
                          onClick={() => handleFontSizeChange(currentPageData.pageNum, item.id, 1)}
                          title="Aumentar tamaño de fuente"
                        >
                          +
                        </button>
                        <button
                          onClick={() => handleFontSizeChange(currentPageData.pageNum, item.id, -1)}
                          title="Disminuir tamaño de fuente"
                        >
                          -
                        </button>
                      </div>

                      <textarea
                        className="pdf-editor__doc-textarea"
                        value={item.text}
                        onChange={(e) => handleTextChange(currentPageData.pageNum, item.id, e.target.value)}
                        rows={Math.max(1, Math.ceil(item.text.length / 70))}
                        placeholder="Escribe texto..."
                      />
                    </div>
                  ))}

                  {/* Added custom text blocks for this page */}
                  {addedBlocks.filter(b => b.pageNum === activePage).map((block) => (
                    <div key={block.id} className="pdf-editor__text-item-row pdf-editor__text-item-row--custom">
                      <span className="pdf-editor__custom-tag">Texto Nuevo</span>
                      <input
                        type="text"
                        className="pdf-editor__doc-input"
                        value={block.text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAddedBlocks(addedBlocks.map(b => b.id === block.id ? { ...b, text: val } : b));
                        }}
                      />
                      <button
                        className="pdf-editor__delete-block-btn"
                        onClick={() => setAddedBlocks(addedBlocks.filter(b => b.id !== block.id))}
                        title="Eliminar bloque de texto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: Visual Overlay Mode */}
          {viewMode === 'visual' && (
            <div className="pdf-editor__visual-view">
              <div
                className="pdf-editor__page-canvas-wrapper"
                style={{
                  width: `${currentPageData?.width}px`,
                  height: `${currentPageData?.height}px`,
                }}
              >
                {/* Background image */}
                <img
                  src={currentPageData?.bgImageUrl}
                  alt={`Página ${currentPageData?.pageNum}`}
                  className="pdf-editor__page-bg"
                />

                {/* Overlaid editable inputs */}
                {currentPageData?.items.map((item) => (
                  <input
                    key={item.id}
                    type="text"
                    className="pdf-editor__overlay-input"
                    value={item.text}
                    onChange={(e) => handleTextChange(currentPageData.pageNum, item.id, e.target.value)}
                    style={{
                      left: `${item.x}px`,
                      top: `${item.y}px`,
                      fontSize: `${item.fontSize}px`,
                      minWidth: `${Math.max(60, item.width)}px`,
                    }}
                  />
                ))}

                {/* Overlaid added custom blocks */}
                {addedBlocks.filter(b => b.pageNum === activePage).map((block) => (
                  <input
                    key={block.id}
                    type="text"
                    className="pdf-editor__overlay-input pdf-editor__overlay-input--new"
                    value={block.text}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAddedBlocks(addedBlocks.map(b => b.id === block.id ? { ...b, text: val } : b));
                    }}
                    style={{
                      left: `${block.x}px`,
                      top: `${block.y}px`,
                      fontSize: `${block.fontSize}px`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
