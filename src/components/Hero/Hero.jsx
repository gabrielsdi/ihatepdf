import './Hero.css';

export default function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="container hero__content">
        <h1 className="hero__title">
          Editor de PDF y Convertidor a Texto
        </h1>

        <p className="hero__subtitle">
          Edita el texto real de tus documentos PDF de forma sencilla. Extrae y modifica párrafos,
          modifica frases o cambia el texto como en Google Docs / Word, y vuelve a exportar tu PDF listo.
        </p>
      </div>
    </section>
  );
}
