import './Hero.css';

export default function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero__bg-text" aria-hidden="true">ODIO</div>

      <div className="container hero__content">
        <div className="hero__badge">
          <span className="hero__badge-dot"></span>
          La pesadilla del PDF está aquí
        </div>

        <h1 className="hero__title">
          <span className="hero__title-line1">Destroza</span>
          <span className="hero__title-line2">tu <span className="hero__title-accent hero__title-glitch" data-text="PDF">PDF</span></span>
        </h1>

        <p className="hero__subtitle">
          Porque el amor es una mentira. Añade texto, marcas de tortura, firmas de sangre
          y dibujos desesperados a tu PDF. Después descárgalo y olvídate de él para siempre.
        </p>

        <div className="hero__drips" aria-hidden="true">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="hero__drip" style={{ '--delay': `${i * 0.4}s`, '--left': `${10 + i * 14}%` }} />
          ))}
        </div>
      </div>
    </section>
  );
}
