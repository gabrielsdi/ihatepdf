import { HeartOff, GitFork, X as XIcon, Globe } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" id="site-footer">
      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div className="footer__brand">
            <div className="footer__logo">
              <div className="footer__logo-icon-wrapper">
                <HeartOff size={20} />
              </div>
              <span className="footer__logo-text">
                i<span className="footer__logo-brand">Hate</span>PDF
              </span>
            </div>
            <p className="footer__brand-desc">
              Tu herramienta de edición de PDF preferida cuando ilovePDF no te deja editar texto.
            </p>
            <div className="footer__social">
              <a href="https://github.com/gabrielsdi/ihatepdf" target="_blank" rel="noreferrer" className="footer__social-btn" id="footer-github" title="GitHub">
                <GitFork size={18} />
              </a>
              <a href="#" className="footer__social-btn" id="footer-twitter" title="Twitter/X">
                <XIcon size={18} />
              </a>
            </div>
          </div>

          {/* Column 1 */}
          <div className="footer__col">
            <h4 className="footer__col-title">HERRAMIENTAS PDF</h4>
            <ul className="footer__links">
              <li><a href="#editor-section" className="footer__link">Editar PDF</a></li>
              <li><a href="#editor-section" className="footer__link">Convertir PDF a DOCX</a></li>
              <li><a href="#editor-section" className="footer__link">Unir PDF</a></li>
              <li><a href="#editor-section" className="footer__link">Comprimir PDF</a></li>
            </ul>
          </div>

          {/* Column 2 */}
          <div className="footer__col">
            <h4 className="footer__col-title">SOLUCIONES</h4>
            <ul className="footer__links">
              <li><a href="#" className="footer__link">Empresas</a></li>
              <li><a href="#" className="footer__link">Educación</a></li>
              <li><a href="#" className="footer__link">Desarrolladores</a></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className="footer__col">
            <h4 className="footer__col-title">COMPAÑÍA</h4>
            <ul className="footer__links">
              <li><a href="#" className="footer__link">Sobre nosotros</a></li>
              <li><a href="#" className="footer__link">Privacidad</a></li>
              <li><a href="#" className="footer__link">Términos y condiciones</a></li>
              <li><a href="#" className="footer__link">Contacto</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer__bottom">
          <div className="footer__copy">
            © iHatePDF 2026 ® - El editor de texto PDF que ilovePDF desearía ser.
          </div>
          <div className="footer__lang">
            <Globe size={16} />
            <span>Español</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
