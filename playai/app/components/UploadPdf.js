import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import PdfCompress from '../services/Compress';
import { pdfFirebase } from '../services/PdfFirebase';

export default function UploadPdf({ onPdfUpload }) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    try {
      setUploading(true);
      const file = acceptedFiles[0];
      
      if (file?.type !== 'application/pdf') {
        throw new Error('Please upload a PDF file');
      }

      // Process the PDF
      const processedPdf = await PdfCompress.compressPdf(file);
      
      // Upload to Firebase
      const firebaseResult = await pdfFirebase.uploadPdf(
        file,
        processedPdf.data,
        {
          pageCount: processedPdf.numPages,
          size: processedPdf.size
        }
      );

      // Combine the data
      const combinedData = {
        ...processedPdf,
        _id: firebaseResult._id,
      };

      onPdfUpload(combinedData);
    } catch (error) {
      console.error('Error processing PDF:', error);
      alert(error.message);
    } finally {
      setUploading(false);
    }
  }, [onPdfUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {'application/pdf': ['.pdf']},
    maxFiles: 1
  });

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div
        {...getRootProps()}
        className={`
          w-full max-w-lg p-8 border-2 border-dashed rounded-lg
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          transition-all duration-200 ease-in-out
        `}
      >
        <input {...getInputProps()} />
        <div className="text-center">
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
              <p className="mt-4 text-sm text-gray-600">Processing PDF...</p>
            </div>
          ) : (
            <>
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-4 text-sm text-gray-600">
                {isDragActive
                  ? "Drop the PDF here"
                  : "Drag and drop a PDF, or click to select"}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}