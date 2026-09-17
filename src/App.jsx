import { useState } from 'react';
import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import DropZone from './components/DropZone/DropZone';
import Footer from './components/Footer/Footer';
import PDFEditor from './components/PDFEditor/PDFEditor';
import AdBanner from './components/Ads/AdBanner';
import { ADS_CONFIG } from './config/adsConfig';
import './App.css';

export default function App() {
  const [pdfFile, setPdfFile] = useState(null);

  const handleFileSelect = (file) => {
    setPdfFile(file);
  };

  const handleReset = () => {
    setPdfFile(null);
  };

  return (
    <div className="app">
      <Header />
      <main className="app__main">
        {pdfFile ? (
          <PDFEditor file={pdfFile} onReset={handleReset} />
        ) : (
          <>
            <Hero />
            <DropZone onFileSelect={handleFileSelect} />
            {ADS_CONFIG.enabled && (
              <AdBanner format="horizontal" scriptContent={ADS_CONFIG.scripts?.horizontalScript} />
            )}
          </>
        )}
      </main>
      {!pdfFile && <Footer />}
    </div>
  );
}

