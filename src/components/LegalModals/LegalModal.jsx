import { X, ShieldCheck, FileText, Lock } from 'lucide-react';
import './LegalModal.css';

export default function LegalModal({ isOpen, onClose, type = 'privacy' }) {
  if (!isOpen) return null;

  const isPrivacy = type === 'privacy';

  return (
    <div className="legal-modal-backdrop" onClick={onClose}>
      <div className="legal-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="legal-modal-close-btn" onClick={onClose} title="Close">
          <X size={20} />
        </button>

        <div className="legal-modal-header">
          <div className="legal-modal-icon">
            {isPrivacy ? <ShieldCheck size={28} /> : <FileText size={28} />}
          </div>
          <div>
            <h2>{isPrivacy ? 'Privacy Policy' : 'Terms of Service'}</h2>
            <p className="legal-modal-subtitle">Last updated: September 2026</p>
          </div>
        </div>

        <div className="legal-modal-body">
          {isPrivacy ? (
            <>
              <div className="legal-highlight-box">
                <Lock size={20} className="legal-highlight-icon" />
                <p>
                  <strong>100% Local Processing:</strong> Your PDF files are never uploaded or stored on any external server. All editing and rendering happen exclusively within your own browser.
                </p>
              </div>

              <h3>1. Information We DO NOT Collect</h3>
              <p>
                At <strong>iHatePDF</strong>, privacy is our top priority. We do not store, inspect, or transmit the contents of the PDF files you edit or process on our platform.
              </p>

              <h3>2. Advertising & Third-Party Services</h3>
              <p>
                To keep this tool completely free and accessible without requiring accounts or subscriptions, we display sponsored advertisements from ad networks such as Monetag.
              </p>
              <p>
                These advertising networks may use standard cookies or anonymous identifiers to display relevant ads and measure traffic metrics without accessing your personal documents.
              </p>

              <h3>3. Local Storage</h3>
              <p>
                We use browser local storage solely to persist your interface preferences locally on your device.
              </p>

              <h3>4. Contact Us</h3>
              <p>
                If you have any questions about our privacy policy, feel free to contact us through our official GitHub repository.
              </p>
            </>
          ) : (
            <>
              <h3>1. Acceptance of Terms</h3>
              <p>
                By accessing and using <strong>iHatePDF</strong>, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>

              <h3>2. Use of Service</h3>
              <p>
                iHatePDF provides browser-based tools for PDF editing. The user is solely responsible for how they use the platform and for ensuring they have all necessary rights over the uploaded files.
              </p>

              <h3>3. Disclaimer of Warranties & Liability</h3>
              <p>
                The service is provided "as is" and "as available" without warranties of any kind. iHatePDF is not liable for data loss or any damages resulting from the use or inability to use the site.
              </p>

              <h3>4. Monetization & External Links</h3>
              <p>
                The site may contain sponsored links or ads from third parties (e.g. Monetag). We are not responsible for the content, privacy policies, or practices of external third-party sites.
              </p>

              <h3>5. Modifications</h3>
              <p>
                We reserve the right to modify or update these Terms of Service at any time without prior notice.
              </p>
            </>
          )}
        </div>

        <div className="legal-modal-footer">
          <button className="legal-modal-btn" onClick={onClose}>
            Got it & Accept
          </button>
        </div>
      </div>
    </div>
  );
}
