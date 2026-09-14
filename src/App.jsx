import { useState } from 'react';
import Header from './components/Header/Header';
import Hero from './components/Hero/Hero';
import DropZone from './components/DropZone/DropZone';
import Footer from './components/Footer/Footer';
import PDFEditor from './components/PDFEditor/PDFEditor';
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
          </>
        )}
      </main>
      {!pdfFile && <Footer />}
    </div>
  );
}

