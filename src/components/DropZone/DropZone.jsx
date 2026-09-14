import { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, HardDrive, Cloud, Box } from 'lucide-react';
import './DropZone.css';

export default function DropZone({ onFileSelect }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const validateAndLoad = useCallback((file) => {
    setError('');
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setError('Solo se admiten archivos PDF válidos.');
      return;
    }
    onFileSelect(file);
  }, [onFileSelect]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    validateAndLoad(file);
  }, [validateAndLoad]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e) => {
    validateAndLoad(e.target.files[0]);
    e.target.value = '';
  }, [validateAndLoad]);

  // Demo file handler in case user wants to test quickly without uploading
  const handleDemoFile = () => {
    // Generate a simple sample PDF blob for quick testing
    fetch('https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf')
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], 'ejemplo_documento.pdf', { type: 'application/pdf' });
        onFileSelect(file);
      })
      .catch(() => {
        setError('No se pudo cargar el archivo de ejemplo.');
      });
  };

  return (
    <section className="dropzone-section" id="editor-section">
      <div className="container">
        <div
          className={`dropzone ${isDragging ? 'dropzone--dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          id="pdf-dropzone"
        >
          <div className="dropzone__content">
            <div className="dropzone__btn-wrapper">
              <label className="btn-primary dropzone__btn" id="select-pdf-btn">
                Seleccionar archivo PDF
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileInput}
                  className="dropzone__hidden-input"
                  id="pdf-file-input"
                />
              </label>

              <div className="dropzone__cloud-buttons">
                <button
                  className="dropzone__cloud-btn"
                  title="Google Drive"
                  onClick={() => alert('Integración con Google Drive disponible en iHatePDF PRO')}
                >
                  <Cloud size={20} className="icon-drive" />
                </button>
                <button
                  className="dropzone__cloud-btn"
                  title="Dropbox"
                  onClick={() => alert('Integración con Dropbox disponible en iHatePDF PRO')}
                >
                  <Box size={20} className="icon-dropbox" />
                </button>
              </div>
            </div>

            <p className="dropzone__drag-text">
              o arrastra y suelta el PDF aquí
            </p>

            <div className="dropzone__demo-link">
              ¿No tienes un PDF a mano? <button type="button" onClick={handleDemoFile} className="dropzone__demo-btn">Usar PDF de prueba</button>
            </div>

            {error && (
              <div className="dropzone__error" id="dropzone-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="dropzone__info-strip">
          <span>🔒 Todos los archivos cargados se procesan en tu navegador sin subirse a ningún servidor.</span>
        </div>
      </div>
    </section>
  );
}
