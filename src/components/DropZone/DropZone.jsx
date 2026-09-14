import { useCallback, useState } from 'react';
import { Upload, FileText, AlertTriangle } from 'lucide-react';
import './DropZone.css';

export default function DropZone({ onFileSelect }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const validateAndLoad = useCallback((file) => {
    setError('');
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Solo aceptamos PDFs. ¿Qué intentabas subir? 😤');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('El archivo es demasiado grande. ¡Ni siquiera queremos tenerlo!');
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

  return (
    <section className="dropzone-section" id="dropzone-section">
      <div className="container">
        <div
          className={`dropzone ${isDragging ? 'dropzone--dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          id="pdf-dropzone"
        >
          {/* Corner decorations */}
          <div className="dropzone__corner dropzone__corner--tl" />
          <div className="dropzone__corner dropzone__corner--tr" />
          <div className="dropzone__corner dropzone__corner--bl" />
          <div className="dropzone__corner dropzone__corner--br" />

          {/* Animated border */}
          <div className="dropzone__border-anim" aria-hidden="true" />

          <div className="dropzone__inner">
            {/* Icon */}
            <div className={`dropzone__icon-wrap ${isDragging ? 'dropzone__icon-wrap--active' : ''}`}>
              {isDragging ? (
                <div className="dropzone__icon-drop">
                  <span>💀</span>
                </div>
              ) : (
                <div className="dropzone__icon-default">
                  <FileText size={40} />
                  <Upload size={20} className="dropzone__upload-arrow" />
                </div>
              )}
            </div>

            {/* Text */}
            <div className="dropzone__text">
              <h2 className="dropzone__title">
                {isDragging
                  ? 'Suéltalo. Hazlo. 💀'
                  : 'Selecciona tu PDF para torturarlo'}
              </h2>
              <p className="dropzone__subtitle">
                {isDragging
                  ? 'Deja caer ese maldito PDF aquí...'
                  : 'o arrastra y suelta el PDF aquí'}
              </p>
            </div>

            {/* Buttons */}
            <div className="dropzone__actions">
              <label className="btn-primary dropzone__btn" id="select-pdf-btn">
                <Upload size={18} />
                Seleccionar PDF
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileInput}
                  className="dropzone__hidden-input"
                  id="pdf-file-input"
                />
              </label>
            </div>

            {/* Source icons (like ilovepdf) */}
            <div className="dropzone__sources">
              <span className="dropzone__sources-label">También puedes arrastrar desde:</span>
              <div className="dropzone__source-icons">
                <div className="dropzone__source-icon" title="Tu ordenador maldito">
                  <span>💻</span>
                </div>
                <div className="dropzone__source-icon" title="Google Drive (si no lo odias también)">
                  <span>☁️</span>
                </div>
                <div className="dropzone__source-icon" title="Dropbox del infierno">
                  <span>📦</span>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="dropzone__error" id="dropzone-error">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Privacy note */}
        <p className="dropzone__privacy">
          🔒 Tu PDF es destruido en nuestros servidores del infierno. Prometemos no usarlo para nada útil.
        </p>
      </div>
    </section>
  );
}
