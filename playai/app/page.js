'use client';

import { useState } from 'react';
import ViewPdf from './components/ViewPdf';
import UploadPdf from "./components/UploadPdf";

export default function Home() {
  const [pdfData, setPdfData] = useState(null);

  const handlePdfUpload = (processedPdf) => {
    setPdfData(processedPdf);
  };

  return (
    <div className="h-screen flex flex-col">
      {pdfData ? (
        <ViewPdf pdfData={pdfData} />
      ) : (
        <UploadPdf onPdfUpload={handlePdfUpload} />
      )}
    </div>
  );
}