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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">PDF Reader Pro</h1>
              <p className="text-sm text-gray-500">Upload and listen to your PDFs</p>
            </div>
            {pdfData && (
              <button 
                onClick={() => setPdfData(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upload New PDF
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden min-h-[calc(100vh-12rem)]">
          {pdfData ? (
            <ViewPdf pdfData={pdfData} />
          ) : (
            <div className="p-6">
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Welcome to PDF Reader Pro
                  </h2>
                  <p className="text-gray-500">
                    Upload your PDF to get started with text-to-speech functionality
                  </p>
                </div>
                <UploadPdf onPdfUpload={handlePdfUpload} />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            PDF Reader Pro - Text to Speech Converter
          </p>
        </div>
      </footer>
    </div>
  );
}