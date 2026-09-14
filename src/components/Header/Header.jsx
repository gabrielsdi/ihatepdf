import { useState } from 'react';
import { Menu, X, HeartOff, ChevronDown, FileText, Layers, Edit3, Lock, RefreshCw, Scissors, Archive, Trash2 } from 'lucide-react';
import './Header.css';

const tools = [
  { label: 'Unir PDF (Obligado)', icon: Layers, desc: 'Junta varios PDFs infames en uno' },
  { label: 'Dividir PDF (A la fuerza)', icon: Scissors, desc: 'Corta tu PDF en pedazos' },
  { label: 'Comprimir PDF', icon: Archive, desc: 'Reduce el peso de tu sufrimiento' },
  { label: 'Convertir PDF (a .DOCX)', icon: RefreshCw, desc: 'Transforma PDF en texto editable' },
  { label: 'Editar PDF (Google Docs style)', icon: Edit3, desc: 'Modifica el texto sin morir en el intento' },
  { label: 'Destruir PDF', icon: Trash2, desc: 'Mándalo a la papelera para siempre' },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="header" id="site-header">
      <nav className="header__nav container">
        {/* Brand Logo - ilovepdf style but with iHatePDF */}
        <a href="/" className="header__logo" id="logo-link">
          <div className="header__logo-icon-wrapper">
            <HeartOff size={26} className="header__logo-icon" />
          </div>
          <span className="header__logo-text">
            i<span className="header__logo-brand">Hate</span>PDF
          </span>
        </a>

        {/* Desktop Nav Links */}
        <div className="header__nav-links">
          <div
            className="header__nav-dropdown"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
            id="tools-dropdown-trigger"
          >
            <button className="header__nav-btn" id="tools-dropdown-btn">
              TODAS LAS HERRAMIENTAS PDF <ChevronDown size={14} className="header__chevron" />
            </button>

            {dropdownOpen && (
              <div className="header__dropdown">
                <div className="header__dropdown-grid">
                  {tools.map((tool, idx) => {
                    const IconComponent = tool.icon;
                    return (
                      <a href="#editor-section" key={idx} className="header__dropdown-item" id={`tool-nav-${idx}`}>
                        <div className="header__dropdown-item-icon">
                          <IconComponent size={20} />
                        </div>
                        <div>
                          <div className="header__dropdown-item-title">{tool.label}</div>
                          <div className="header__dropdown-item-desc">{tool.desc}</div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <a href="#editor-section" className="header__nav-link">CONVERTIR A DOCX</a>
          <a href="#editor-section" className="header__nav-link header__nav-link--active">EDITAR PDF</a>
          <a href="#editor-section" className="header__nav-link">DESTRUIR PDF</a>
        </div>

        {/* Auth / Right Actions */}
        <div className="header__actions">
          <a href="#" className="header__login-link" id="login-link">Iniciar sesión</a>
          <a href="#" className="header__register-btn" id="register-btn">
            Registrarse
          </a>
          <button
            className="header__mobile-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
            id="mobile-menu-btn"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Mobile Nav Menu */}
      {menuOpen && (
        <div className="header__mobile-menu" id="mobile-menu">
          <div className="header__mobile-tools">
            {tools.map((t, idx) => {
              const Icon = t.icon;
              return (
                <a href="#editor-section" key={idx} className="header__mobile-item" onClick={() => setMenuOpen(false)}>
                  <Icon size={18} />
                  <span>{t.label}</span>
                </a>
              );
            })}
          </div>
          <div className="header__mobile-actions">
            <a href="#" className="btn-secondary" style={{ width: '100%' }}>Iniciar sesión</a>
            <a href="#" className="btn-primary" style={{ width: '100%' }}>Registrarse</a>
          </div>
        </div>
      )}
    </header>
  );
}
