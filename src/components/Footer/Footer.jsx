import { useState } from 'react';
import LegalModal from '../LegalModals/LegalModal';
import './Footer.css';

export default function Footer() {
  const [legalModalType, setLegalModalType] = useState(null);

  return (
    <footer className="footer" id="site-footer">
      <div className="container">
        <div className="footer__bottom">
          <div className="footer__copy">
            © iHatePDF 2026. The free, 100% private in-browser PDF editor.
          </div>
          <div className="footer__legal-links">
            <button
              className="footer__legal-btn"
              onClick={() => setLegalModalType('privacy')}
            >
              Privacy Policy
            </button>
            <span className="footer__legal-sep">•</span>
            <button
              className="footer__legal-btn"
              onClick={() => setLegalModalType('terms')}
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>

      <LegalModal
        isOpen={!!legalModalType}
        onClose={() => setLegalModalType(null)}
        type={legalModalType || 'privacy'}
      />
    </footer>
  );
}
