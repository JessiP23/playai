import { db } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';

export const pdfFirebase = {
  async uploadPdf(file, pdfData, metadata) {
    try {
      // Convert Uint8Array to regular array for Firestore storage
      const pdfArray = Array.from(pdfData);
      
      // Save data directly to Firestore
      const docRef = await addDoc(collection(db, 'pdfs'), {
        name: file.name,
        size: file.size,
        pageCount: metadata.pageCount,
        pdfData: pdfArray, // Store PDF data directly
        createdAt: new Date().toISOString(),
        type: file.type
      });

      return {
        _id: docRef.id,
        name: file.name,
        pageCount: metadata.pageCount,
        size: file.size
      };
    } catch (error) {
      console.error('Error uploading to Firestore:', error);
      throw error;
    }
  }
};