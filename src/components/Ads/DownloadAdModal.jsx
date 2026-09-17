import { useState, useEffect, useRef } from 'react';
import { ADS_CONFIG } from '../../config/adsConfig';
import AdBanner from './AdBanner';
import { Loader2, Download, CheckCircle2, X } from 'lucide-react';
import './DownloadAdModal.css';

export default function DownloadAdModal({ isOpen, onClose, onDownload, fileName = 'document.pdf' }) {
  const [timeLeft, setTimeLeft] = useState(ADS_CONFIG.counterSeconds || 5);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setTimeLeft(ADS_CONFIG.counterSeconds || 5);
      setIsCompleted(false);
      setIsDownloading(false);
      hasTriggeredRef.current = false;
      return;
    }

    if (!ADS_CONFIG.enabled || !ADS_CONFIG.showDownloadModal) {
      // If ads or modal are disabled, trigger download immediately and close modal
      onDownload();
      onClose();
      return;
    }

    // Countdown logic
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onDownload, onClose]);

  // Handle auto-download trigger when timer reaches 0
  useEffect(() => {
    if (isOpen && timeLeft === 0 && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      triggerDownloadProcess();
    }
  }, [timeLeft, isOpen]);

  const triggerDownloadProcess = async () => {
    try {
      setIsDownloading(true);
      await onDownload();
      setIsCompleted(true);
    } catch (err) {
      console.error('Error auto-downloading:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen || !ADS_CONFIG.enabled || !ADS_CONFIG.showDownloadModal) {
    return null;
  }

  const initialTime = ADS_CONFIG.counterSeconds || 5;
  const progressPercent = Math.min(100, Math.max(0, ((initialTime - timeLeft) / initialTime) * 100));

  return (
    <div className="download-modal-backdrop" onClick={onClose}>
      <div className="download-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header Close Button */}
        <button className="download-modal-close-btn" onClick={onClose} title="Close">
          <X size={18} />
        </button>

        {/* Modal Header / Status */}
        <div className="download-modal-header">
          {isCompleted ? (
            <div className="download-status-icon completed">
              <CheckCircle2 size={32} />
            </div>
          ) : isDownloading ? (
            <div className="download-status-icon downloading">
              <Loader2 size={32} className="download-spinner" />
            </div>
          ) : (
            <div className="download-status-counter">
              <span className="counter-number">{timeLeft}</span>
              <span className="counter-unit">sec</span>
            </div>
          )}

          <div className="download-header-text">
            <h3>
              {isCompleted
                ? 'Your PDF is ready!'
                : isDownloading
                ? 'Generating & saving file...'
                : 'Preparing your PDF document...'}
            </h3>
            <p className="download-header-sub font-mono">
              {isCompleted
                ? `The download of ${fileName} has started automatically.`
                : `Your download will start automatically in ${timeLeft} second${timeLeft !== 1 ? 's' : ''}.`}
            </p>
          </div>
        </div>

        {/* Animated Progress Bar */}
        {!isCompleted && (
          <div className="download-progress-track">
            <div
              className="download-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Featured Ad Banner inside Modal */}
        <div className="download-modal-ad-section">
          <AdBanner format="modal" scriptContent={ADS_CONFIG.scripts?.modalAdScript} />
        </div>

        {/* Modal Action Buttons */}
        <div className="download-modal-actions">
          {isCompleted ? (
            <div className="download-completed-group">
              <button
                className="download-action-btn primary"
                onClick={triggerDownloadProcess}
              >
                <Download size={18} />
                <span>Download again</span>
              </button>
              <button className="download-action-btn secondary" onClick={onClose}>
                <span>Done & close</span>
              </button>
            </div>
          ) : (
            <button
              className="download-action-btn primary"
              onClick={triggerDownloadProcess}
              disabled={isDownloading}
            >
              <Download size={18} />
              <span>Download now without waiting</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
