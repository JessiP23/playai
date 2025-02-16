import Pako from "pako";
import { PDFDocument } from "pdf-lib";
import PdfAVLTree from "../components/TreeNode";

class PdfCompress {
    static async compressPdf(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const documentPdf = await PDFDocument.load(arrayBuffer);
            const pageCount = documentPdf.getPageCount();
            
            // Dynamic batch size based on file size and page count
            const batchSize = this.calculateOptimalBatchSize(file.size, pageCount);
            const tree = new PdfAVLTree();


            const pdfBytes = await documentPdf.save();
            const compressed = await this.compressBatch(pdfBytes);
            tree.root = tree.insert(tree.root, compressed, 1, pageCount);


            return {
                id: Date.now(),
                name: file.name,
                size: file.size,
                pageCount,
                tree: tree,
                metadata: {
                    lastModified: file.lastModified,
                    type: file.type,
                    batchSize
                }
            };
        } catch (error) {
            console.error('Error compressing PDF:', error);
            throw new Error('Failed to process PDF file');
        }
    }

    static calculateOptimalBatchSize(fileSize, pageCount) {
        const baseSize = 5;
        const sizeFactor = Math.floor(fileSize / (1024 * 1024)); // Size in MB
        return Math.max(2, Math.min(baseSize - sizeFactor, pageCount));
    }

    static async compressBatch(batch) {
        const compressionLevel = 6;
        return Pako.deflate(new Uint8Array(batch), { level: compressionLevel });
    }

    static async decompressPdf(compressedData) {
        try {
            const decompressed = Pako.inflate(compressedData);
            return decompressed;
        } catch (error) {
            console.error('Error decompressing PDF:', error);
            throw new Error('Failed to decompress PDF data');
        }
    }
}

export default PdfCompress;