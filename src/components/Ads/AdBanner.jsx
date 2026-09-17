import { useEffect, useRef } from 'react';
import { ADS_CONFIG } from '../../config/adsConfig';
import { ExternalLink, Sparkles } from 'lucide-react';
import './AdBanner.css';

export default function AdBanner({ format = 'horizontal', scriptContent, className = '' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!ADS_CONFIG.enabled) return;

    // Inject custom ad script if provided
    if (scriptContent && containerRef.current) {
      containerRef.current.innerHTML = '';
      const range = document.createRange();
      range.selectNode(containerRef.current);
      const documentFragment = range.createContextualFragment(scriptContent);
      containerRef.current.appendChild(documentFragment);
    }
  }, [scriptContent]);

  if (!ADS_CONFIG.enabled) {
    return null;
  }

  const handleAdClick = (e) => {
    if (ADS_CONFIG.directLink && !scriptContent) {
      e.stopPropagation();
      window.open(ADS_CONFIG.directLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className={`ad-banner-container ad-banner--${format} ${className}`}
      onClick={handleAdClick}
      style={{ cursor: ADS_CONFIG.directLink ? 'pointer' : 'default' }}
    >
      <div className="ad-banner-header">
        <span className="ad-banner-badge">Advertisement</span>
      </div>

      <div ref={containerRef} className="ad-banner-content">
        <div className="ad-banner-placeholder">
          <div className="ad-banner-icon-wrapper">
            <Sparkles size={24} className="ad-banner-sparkle" />
          </div>
          <div className="ad-banner-info">
            <p className="ad-banner-title">Sponsored by Monetag</p>
            <p className="ad-banner-sub">
              {format === 'modal' ? 'Featured pre-download banner' : 'Click to view sponsored offer'}
            </p>
          </div>
          <div className="ad-banner-fake-cta">
            <span>View Offer</span>
            <ExternalLink size={12} />
          </div>
        </div>
      </div>
    </div>
  );
}
