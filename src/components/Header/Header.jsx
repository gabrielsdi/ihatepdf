import { useState } from 'react';
import { Menu, X, Skull, ChevronDown } from 'lucide-react';
import './Header.css';

const tools = [
  { label: 'Destruir PDF', emoji: '💥' },
  { label: 'Torturar PDF', emoji: '🔥' },
  { label: 'Aplastar PDF', emoji: '🪓' },
  { label: 'Mutilar PDF', emoji: '⚡' },
  { label: 'Hundir PDF', emoji: '🌊' },
  { label: 'Maldecir PDF', emoji: '☠️' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="header" id="site-header">
      <nav className="header__nav container">
        {/* Logo */}
        <a href="/" className="header__logo" id="logo-link">
          <Skull size={28} className="header__logo-icon" />
          <span className="header__logo-text">
            i<span className="header__logo-hate">hate</span>pdf
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="header__nav-links">
          <div
            className="header__nav-dropdown"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
            id="tools-dropdown-trigger"
          >
            <button className="header__nav-btn" id="tools-dropdown-btn">
              Todas las torturas <ChevronDown size={14} />
            </button>
            <div className={`header__dropdown ${dropdownOpen ? 'header__dropdown--open' : ''}`}>
              <div className="header__dropdown-title">HERRAMIENTAS DE TORTURA PDF</div>
              <ul className="header__dropdown-list">
                {tools.map((t, i) => (
                  <li key={i}>
                    <a href="#" className="header__dropdown-item" id={`tool-${i}`}>
                      <span>{t.emoji}</span>
                      <span>{t.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="header__actions">
          <a href="#" className="header__link" id="login-link">Entrar</a>
          <a href="#" className="btn-primary header__cta" id="register-btn">
            Unirse al infierno
          </a>
          {/* Mobile menu toggle */}
          <button
            className="header__mobile-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            id="mobile-menu-btn"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`header__mobile-menu ${menuOpen ? 'header__mobile-menu--open' : ''}`} id="mobile-menu">
        <ul className="header__mobile-list">
          {tools.map((t, i) => (
            <li key={i}>
              <a href="#" className="header__mobile-item" id={`mobile-tool-${i}`}>
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="header__mobile-actions">
          <a href="#" className="btn-secondary" id="mobile-login-btn">Entrar</a>
          <a href="#" className="btn-primary" id="mobile-register-btn">Unirse al infierno</a>
        </div>
      </div>
    </header>
  );
}
