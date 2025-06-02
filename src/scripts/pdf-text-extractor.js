/**
 * PDF Text Extractor
 * Uses PDF.js worker ONLY for text extraction (not rendering)
 */
window.PdfTextExtractor = class PdfTextExtractor {
  constructor() {
    this.pdfjsLib = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return true;

    try {
      // Dynamically import PDF.js from npm package
      this.pdfjsLib = await import('pdfjs-dist');
      
      // Set worker source to use the npm package worker
      this.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      
      this.isInitialized = true;
      console.log('PDF Text Extractor initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize PDF Text Extractor:', error);
      return false;
    }
  }

  async extractText(pdfUrl) {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) throw new Error('Failed to initialize PDF.js');
    }

    try {
      const pdf = await this.pdfjsLib.getDocument(pdfUrl).promise;
      const textData = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = this.processTextItems(textContent.items);
        textData.push(pageText);
      }
      
      return textData;
    } catch (error) {
      console.error('Text extraction failed:', error);
      throw error;
    }
  }

  processTextItems(items) {
    return items.map(item => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width,
      height: item.height,
      fontName: item.fontName,
      fontSize: item.height
    }));
  }

  async extractPageText(pdfUrl, pageNumber) {
    if (!this.isInitialized) {
      const success = await this.initialize();
      if (!success) throw new Error('Failed to initialize PDF.js');
    }

    try {
      const pdf = await this.pdfjsLib.getDocument(pdfUrl).promise;
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      
      return this.processTextItems(textContent.items);
    } catch (error) {
      console.error('Page text extraction failed:', error);
      throw error;
    }
  }

  // Extract plain text for TTS
  async extractPlainText(pdfUrl, pageNumber = null) {
    const textData = pageNumber 
      ? [await this.extractPageText(pdfUrl, pageNumber)]
      : await this.extractText(pdfUrl);

    return textData.map(pageItems => 
      pageItems
        .filter(item => item.text.trim())
        .map(item => item.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    );
  }
}