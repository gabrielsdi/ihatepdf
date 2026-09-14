import { Skull, GitFork, X as XIcon } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" id="site-footer">
      <div className="container">
        {/* Top divider with drips */}
        <div className="footer__drips" aria-hidden="true">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="footer__drip"
              style={{ '--left': `${5 + i * 12}%`, '--h': `${20 + (i % 3) * 15}px`, '--delay': `${i * 0.3}s` }}
            />
          ))}
        </div>

        <div className="footer__grid">
          {/* Brand */}
          <div className="footer__brand">
            <div className="footer__logo">
              <Skull size={24} className="footer__logo-icon" />
              <span className="footer__logo-text">
                i<span className="footer__logo-hate">hate</span>pdf
              </span>
            </div>
            <p className="footer__brand-desc">
              La única herramienta PDF creada con pura rabia existencial. Torturamos PDFs desde 2024.
            </p>
            <div className="footer__social">
              <a href="https://github.com/gabrielsplendiani/ihatepdf" className="footer__social-btn" id="footer-github" title="GitHub">
                <GitFork size={18} />
              </a>
              <a href="#" className="footer__social-btn" id="footer-twitter" title="Twitter/X">
                <XIcon size={18} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div className="footer__col">
            <h4 className="footer__col-title">Torturas</h4>
            <ul className="footer__links">
              {['Editar PDF', 'Torturar PDF', 'Destruir PDF', 'Maldecir PDF'].map((l, i) => (
                <li key={i}><a href="#" className="footer__link" id={`footer-tool-${i}`}>{l}</a></li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Empresa</h4>
            <ul className="footer__links">
              {['Sobre el odio', 'Política de oscuridad', 'Términos de sufrimiento', 'Contacto'].map((l, i) => (
                <li key={i}><a href="#" className="footer__link" id={`footer-company-${i}`}>{l}</a></li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">¿Odias el amor?</h4>
            <p className="footer__col-desc">
              ¿Te hicieron usar ilovePDF en el trabajo? Aquí somos la alternativa oscura.
            </p>
            <a href="#" className="btn-primary footer__cta" id="footer-start-btn">
              Empezar a odiar →
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer__bottom">
          <p className="footer__copy">
            © 2024 iHatePDF. Todos los PDFs merecen sufrir.
          </p>
          <p className="footer__parody">
            ⚠️ Parodia de ilovePDF. Sin ningún tipo de afiliación con los amantes del PDF.
          </p>
        </div>
      </div>
    </footer>
  );
}
