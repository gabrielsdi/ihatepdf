import { useState } from 'react';
import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import DropZone from './components/DropZone/DropZone';
import FeaturesSection from './components/FeaturesSection/FeaturesSection';
import Footer from './components/Footer/Footer';
import PDFEditor from './components/PDFEditor/PDFEditor';
import './App.css';

export default function App() {
  const [pdfFile, setPdfFile] = useState(null);

  const handleFileSelect = (file) => {
    setPdfFile(file);
  };

  const handleCloseEditor = () => {
    setPdfFile(null);
  };

  return (
    <>
      {/* PDF Editor fullscreen overlay */}
      {pdfFile && (
        <PDFEditor file={pdfFile} onClose={handleCloseEditor} />
      )}

      {/* Main landing page */}
      <div className={`app ${pdfFile ? 'app--hidden' : ''}`}>
        <Header />
        <main className="app__main">
          <Hero />
          <DropZone onFileSelect={handleFileSelect} />
          <FeaturesSection />
        </main>
        <Footer />
      </div>
    </>
  );
}
