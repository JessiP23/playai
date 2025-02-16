'use client';

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import Loading from "./Loading";
import dynamic from "next/dynamic";
import PdfCompress from "../services/Compress";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;


function ViewPdf({ pdfData }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState(null);

  async function loadPdfContent() {
    if (!pdfData) return;
    
    try {
      setLoading(true);
      setError(null);
      const node = pdfData.tree?.search(pdfData.tree.root, pageNumber);
      
      if (node) {
        const decompressedContent = await PdfCompress.decompressPdf(node.data);
        // Create a Blob from the decompressed data
        const blob = new Blob([decompressedContent], { type: 'application/pdf' });
        // Create an object URL from the blob
        const url = URL.createObjectURL(blob);
        setContent(url);
      }
    } catch (err) {
      console.error("Error loading PDF page:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (content) {
        URL.revokeObjectURL(content);
      }
    };
  }, [content]);

  useEffect(() => {
    loadPdfContent();
  }, [pageNumber, pdfData]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  function nextPage() {
    setPageNumber((prev) => Math.min(prev + 1, numPages || 1));
  }

  function prevPage() {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-black">
      {/* Zoom controls */}
      <div className="flex justify-between items-center p-4 border-b">
        <div className="flex space-x-2">
          <button
            onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.5))}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            -
          </button>
          <button
            onClick={() => setScale((prev) => Math.min(prev + 0.1, 2.0))}
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
          >
            +
          </button>
          <span className="px-2 py-1">{Math.round(scale * 100)}%</span>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <Loading />
        ) : (
          <Document
            file={content}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<Loading />}
            className="flex justify-center"
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        )}
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between p-4 border-t bg-white">
        <button
          onClick={prevPage}
          disabled={pageNumber <= 1}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
        >
          Previous
        </button>
        
        <div className="flex items-center space-x-2">
          <span>
            Page {pageNumber} of {numPages || "?"}
          </span>
          <input
            type="number"
            min={1}
            max={numPages}
            value={pageNumber}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              if (value >= 1 && value <= (numPages || 1)) {
                setPageNumber(value);
              }
            }}
            className="w-16 px-2 py-1 border rounded"
          />
        </div>

        <button
          onClick={nextPage}
          disabled={pageNumber >= (numPages || 1)}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
        >
          Next
        </button>
      </div>
    </div>
  );
}


export default ViewPdf;