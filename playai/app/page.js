import Image from "next/image";
import PdfViewer from "./components/ViewPdf";

export default function Home() {
  return (
    <>
      <PdfViewer url={"https://pdfobject.com/pdf/sample.pdf"} />
    </>
  );
}
