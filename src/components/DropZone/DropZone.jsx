import { useCallback, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import './DropZone.css';

export default function DropZone({ onFileSelect }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const validateAndLoad = useCallback((file) => {
    setError('');
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setError('Please select a valid PDF file.');
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
                Select PDF file
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileInput}
                  className="dropzone__hidden-input"
                  id="pdf-file-input"
                />
              </label>
            </div>

            <p className="dropzone__drag-text">
              or drop PDF here
            </p>

            {error && (
              <div className="dropzone__error" id="dropzone-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

