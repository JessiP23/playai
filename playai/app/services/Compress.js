// compress/decompress files
import Pako from "pako";
import { PDFDocument } from "pdf-lib";
import { metadata } from "../layout";

class PdfCompress {
    static async compressPdf(file) {
        const arrayBuffer = await file.arrayBuffer();

        const documentPdf = await PDFDocument.load(arrayBuffer);

        const pdfBytes = await documentPdf.save();

        // obtain size pages and count for pdf file
        const pageCount = documentPdf.getPageCount();

        // create batches of pages to load by clicking te next/prev button
        const batches = [];
        const batchSize = 5;

        for (let i = 0; i < pageCount; i += batchSize) {
            const batch = arrayBuffer.slice(i * (arrayBuffer.byteLength / pageCount), Math.min((i + batchSize) * (arrayBuffer.byteLength / pageCount), arrayBuffer.byteLength));

            // compress each batch
            const batchBeingCompressed = Pako.deflate(new Uint8Array(batch));
            batches.push({
                start: i,
                end: Math.min(i + batchSize - 1, pageCount - 1),
                data: batchBeingCompressed
            });
        };

        return {
            id: Date.now(),
            name: file.name,
            pageCount,
            batches,
            pdfBytes,
            metadata: {
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
            }
        };
    }

    static async decompressPdf(batch) {
        const pdfDecompressed = Pako.inflate(batch.data);
        return pdfDecompressed;
    }
}

export default PdfCompress;