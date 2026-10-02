declare module 'pdfkit/output' {
  import type PDFKit from 'pdfkit'

  export function toBlob(document: PDFKit.PDFDocument): Promise<Blob>
}

declare module 'pdfkit/standard-fonts/Courier' {
  const fontData: unknown
  export default fontData
}

declare module 'pdfkit/standard-fonts/Helvetica' {
  const fontData: unknown
  export default fontData
}

declare module 'pdfkit/standard-fonts/HelveticaBold' {
  const fontData: unknown
  export default fontData
}