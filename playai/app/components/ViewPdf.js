import { useState, useEffect } from "react";
import { Document, Page } from "react-pdf";
import PdfCompress from "../services/Compress";

function ViewPdf({ dataOfPdf }) {
  // current page [1, pageCount]
  const [currentPage, setCurrentPage] = useState(1);
  // state for content
  const [content, setContent] = useState(null);
  // loading state
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPage(currentPage);
  }, [currentPage]);

  const loadPage = async (currentPageNum) => {

    // get the batch that contains the current page
    const batchOfCurrentPage = dataOfPdf.batches.find(batch => currentPageNum >= batch.start && currentPageNum <= batch.end);

    if (batchOfCurrentPage) {
      const decompressPdf = await PdfCompress.getPageContent(batchOfCurrentPage);
      setContent(decompressPdf);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <Document file={content}>
          <Page pageNumber={currentPage} />
        </Document>
      </div>
      <div className="flex items-center justify-between p-4 border-t">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Previous
        </button>
        
        <div className="flex items-center space-x-2">
          <span>Page {currentPage} of {pdfData.pageCount}</span>
          <input
            type="number"
            min={1}
            max={pdfData.pageCount}
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className="w-16 px-2 py-1 border rounded"
          />
        </div>
        
        <button
          onClick={() => setCurrentPage(p => Math.min(pdfData.pageCount, p + 1))}
          disabled={currentPage >= pdfData.pageCount}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )

}