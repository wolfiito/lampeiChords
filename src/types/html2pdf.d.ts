declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | [number, number, number, number]
    filename?: string
    image?: { type?: string; quality?: number }
    enableLinks?: boolean
    html2canvas?: { scale?: number; useCORS?: boolean; scrollY?: number }
    jsPDF?: { unit?: string; format?: string | [number, number]; orientation?: 'portrait' | 'landscape' }
    pagebreak?: { mode?: string | string[]; before?: string; after?: string; avoid?: string }
  }

  interface Html2PdfInstance {
    set(opt: Html2PdfOptions): Html2PdfInstance
    from(src: HTMLElement | string): Html2PdfInstance
    save(): Promise<void>
    outputPdf(type?: string): Promise<any>
    toPdf(): Html2PdfInstance
  }

  function html2pdf(): Html2PdfInstance
  function html2pdf(element: HTMLElement, options?: Html2PdfOptions): Promise<void>

  export default html2pdf
}
