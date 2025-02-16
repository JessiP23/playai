import { getDocument } from 'pdfjs-dist';
import pako from 'pako';

const PdfCompress = {
  async compressPdf(file) {
    try {
      // Get the file's ArrayBuffer and create a copy.
      const arrayBuffer = await file.arrayBuffer();
      const bufferCopy = arrayBuffer.slice(0);
      
      // Create a Uint8Array from the copy
      const pdfData = new Uint8Array(bufferCopy);
      
      // Use pako to compress the PDF data
      const compressedData = pako.deflate(pdfData);
      
      // For pdfjs-dist, make another copy (to prevent detachment issues)
      const pdfDataForPdfjs = pdfData.slice();
      const pdf = await getDocument({ data: pdfDataForPdfjs }).promise;
      const numPages = pdf.numPages;
      
      return {
        // Use compressed data for Firestore upload
        data: compressedData,
        name: file.name,
        size: file.size,
        numPages: numPages,
        type: file.type,
        lastModified: file.lastModified
      };
    } catch (error) {
      console.error('Error compressing PDF:', error);
      throw error;
    }
  },

  async decompressPdf(compressedData) {
    try {
      const decompressedData = pako.inflate(compressedData);
      return decompressedData;
    } catch (error) {
      console.error('Error decompressing PDF:', error);
      throw error;
    }
  }
};

export default PdfCompress;