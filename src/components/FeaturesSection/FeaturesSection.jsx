import { Edit3, RefreshCw, Download, ShieldCheck, FileText, Layers } from 'lucide-react';
import './FeaturesSection.css';

const features = [
  {
    icon: <Edit3 size={32} className="feature-icon" />,
    title: 'Edición de texto directa',
    desc: 'Edita palabras, oraciones o párrafos enteros directamente desde tu navegador sin perder el formato.',
  },
  {
    icon: <RefreshCw size={32} className="feature-icon" />,
    title: 'Estilo Google Drive / Word',
    desc: 'Transforma el contenido de tu PDF en bloques de texto editables al instante como si fuera un .DOCX.',
  },
  {
    icon: <Download size={32} className="feature-icon" />,
    title: 'Exportación a PDF en 1-Clic',
    desc: 'Descarga tu documento modificado en formato PDF listo para enviar o presentar.',
  },
  {
    icon: <ShieldCheck size={32} className="feature-icon" />,
    title: '100% Seguro y Privado',
    desc: 'Tus archivos nunca se suben a ningún servidor externo. Todo el procesamiento ocurre en tu navegador.',
  },
  {
    icon: <FileText size={32} className="feature-icon" />,
    title: 'Mantiene la Estructura',
    desc: 'El texto editado se vuelve a colocar en sus coordenadas originales cubriendo el texto anterior de forma limpia.',
  },
  {
    icon: <Layers size={32} className="feature-icon" />,
    title: 'Soporte Multipágina',
    desc: 'Edita documentos de múltiples páginas seleccionando fácilmente entre miniatura de vista previa.',
  },
];

export default function FeaturesSection() {
  return (
    <section className="features" id="features-section">
      <div className="container">
        <div className="features__header">
          <h2 className="features__title">La mejor forma de editar texto en un PDF (sin sufrir)</h2>
          <p className="features__subtitle">
            Sabemos cuánto odias los archivos PDF cuando no te dejan editar su contenido.
            Por eso creamos iHatePDF: la herramienta que convierte tus PDFs en texto editable al instante.
          </p>
        </div>

        <div className="features__grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i} id={`feature-${i}`}>
              <div className="feature-card__icon-wrapper">
                {f.icon}
              </div>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__desc">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats banner (matching ilovepdf style) */}
        <div className="features__stats">
          <div className="features__stat">
            <span className="features__stat-number">100M+</span>
            <span className="features__stat-label">PDFs convertidos</span>
          </div>
          <div className="features__stat-divider" />
          <div className="features__stat">
            <span className="features__stat-number">0s</span>
            <span className="features__stat-label">Tiempo de espera en servidor</span>
          </div>
          <div className="features__stat-divider" />
          <div className="features__stat">
            <span className="features__stat-number">100%</span>
            <span className="features__stat-label">Gratis e ilimitado</span>
          </div>
        </div>
      </div>
    </section>
  );
}
