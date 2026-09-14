import { Flame, Zap, Skull, Scissors, Eye, Ghost } from 'lucide-react';
import './FeaturesSection.css';

const features = [
  {
    icon: <Flame size={28} />,
    emoji: '🔥',
    title: 'Añade texto de odio',
    desc: 'Escribe lo que realmente piensas en ese PDF. Fuentes, tamaños, colores de ira.',
    tag: 'TEXTO',
  },
  {
    icon: <Skull size={28} />,
    emoji: '☠️',
    title: 'Dibuja tu furia',
    desc: 'Usa el pincel libre para plasmar tu desesperación directamente sobre el documento.',
    tag: 'DIBUJO',
  },
  {
    icon: <Scissors size={28} />,
    emoji: '✂️',
    title: 'Añade formas de tormento',
    desc: 'Rectángulos, círculos y flechas para señalar exactamente lo que odias.',
    tag: 'FORMAS',
  },
  {
    icon: <Zap size={28} />,
    emoji: '⚡',
    title: 'Insertar imágenes de horror',
    desc: 'Añade imágenes perturbadoras (o lo que sea) encima de ese maldito PDF.',
    tag: 'IMÁGENES',
  },
  {
    icon: <Eye size={28} />,
    emoji: '👁️',
    title: 'Resalta la catástrofe',
    desc: 'Marca en rojo sangre las partes que más te hacen sufrir del documento.',
    tag: 'SUBRAYADO',
  },
  {
    icon: <Ghost size={28} />,
    emoji: '👻',
    title: 'Descarga y olvida',
    desc: 'Exporta el PDF torturado y bórralo de tu memoria. Nosotros también lo olvidamos.',
    tag: 'DESCARGA',
  },
];

export default function FeaturesSection() {
  return (
    <section className="features" id="features-section">
      <div className="container">
        <div className="features__header">
          <span className="features__tag">HERRAMIENTAS DE TORTURA</span>
          <h2 className="features__title">¿Qué puedes hacerle a tu PDF?</h2>
          <p className="features__subtitle">
            Todo lo que ilovePDF hace, pero con más odio, más oscuridad y sin ningún tipo de amor.
          </p>
        </div>

        <div className="features__grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i} id={`feature-${i}`} style={{ '--i': i }}>
              <div className="feature-card__tag">{f.tag}</div>
              <div className="feature-card__icon">
                <span className="feature-card__emoji">{f.emoji}</span>
                {f.icon}
              </div>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__desc">{f.desc}</p>
              <div className="feature-card__glow" aria-hidden="true" />
            </div>
          ))}
        </div>

        {/* Stats banner (parody of ilovepdf's stats) */}
        <div className="features__stats">
          <div className="features__stat">
            <span className="features__stat-number">666M+</span>
            <span className="features__stat-label">PDFs torturados</span>
          </div>
          <div className="features__stat-divider" />
          <div className="features__stat">
            <span className="features__stat-number">13</span>
            <span className="features__stat-label">Herramientas del infierno</span>
          </div>
          <div className="features__stat-divider" />
          <div className="features__stat">
            <span className="features__stat-number">0%</span>
            <span className="features__stat-label">Amor por el PDF</span>
          </div>
          <div className="features__stat-divider" />
          <div className="features__stat">
            <span className="features__stat-number">∞</span>
            <span className="features__stat-label">Odio acumulado</span>
          </div>
        </div>
      </div>
    </section>
  );
}
