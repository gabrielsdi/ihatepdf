import { HeartOff } from 'lucide-react';
import './Header.css';

export default function Header() {
  return (
    <header className="header" id="site-header">
      <nav className="header__nav container">
        {/* Brand Logo */}
        <a href="/" className="header__logo" id="logo-link">
          <div className="header__logo-icon-wrapper">
            <HeartOff size={24} className="header__logo-icon" />
          </div>
          <span className="header__logo-text">
            i<span className="header__logo-brand">Hate</span>PDF
          </span>
        </a>

        {/* Clean nav items matching ilovepdf */}
        <div className="header__nav-links">
          <a href="#editor-section" className="header__nav-link header__nav-link--active">EDITAR PDF</a>
        </div>
      </nav>
    </header>
  );
}
