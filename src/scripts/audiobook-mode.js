/**
 * Audiobook Mode Implementation
 * High-quality voice selection, speed control, auto-page advancement
 */
window.AudiobookMode = class AudiobookMode {
  constructor(pdfUrl, pdfContainer) {
    this.pdfUrl = pdfUrl;
    this.pdfContainer = pdfContainer;
    this.textExtractor = new window.PdfTextExtractor();
    this.ttsManager = new window.UniversalTTSManager();
    this.textData = [];
    this.currentPage = 1;
    this.totalPages = 0;
    this.isPlaying = false;
    this.settings = {
      speed: 1.0,
      pitch: 1.0,
      volume: 0.85,
      autoAdvance: true,
      voice: null
    };
    this.onPageChange = null;
    this.onStatusChange = null;
  }

  async initialize() {
    try {
      console.log('Initializing Audiobook Mode...');
      
      // Initialize TTS
      const ttsSuccess = await this.ttsManager.initialize();
      if (!ttsSuccess) {
        console.warn('TTS initialization failed, but continuing...');
      }

      // Initialize text extractor
      const extractorSuccess = await this.textExtractor.initialize();
      if (!extractorSuccess) {
        throw new Error('Failed to initialize PDF text extractor');
      }

      // Extract all text data
      this.textData = await this.textExtractor.extractText(this.pdfUrl);
      this.totalPages = this.textData.length;

      // Setup TTS callbacks
      this.ttsManager.onEnd = () => this.handleTTSEnd();
      this.ttsManager.onStatusChange = (status) => this.handleStatusChange(status);

      console.log(`Audiobook Mode initialized: ${this.totalPages} pages`);
      return true;
    } catch (error) {
      console.error('Audiobook Mode initialization failed:', error);
      throw error;
    }
  }

  async startReading(pageNumber = null) {
    if (pageNumber) {
      this.currentPage = pageNumber;
    }

    if (this.currentPage > this.totalPages) {
      console.log('Reached end of document');
      return;
    }

    try {
      const pageText = this.getPageText(this.currentPage);
      if (!pageText || pageText.trim().length === 0) {
        console.warn(`No text found on page ${this.currentPage}, skipping...`);
        if (this.settings.autoAdvance) {
          await this.nextPage();
        }
        return;
      }

      console.log(`Starting to read page ${this.currentPage}...`);
      
      await this.ttsManager.speak(pageText, {
        rate: this.settings.speed,
        pitch: this.settings.pitch,
        volume: this.settings.volume,
        voice: this.settings.voice
      });

      this.isPlaying = true;
      this.onStatusChange?.({ 
        isPlaying: true, 
        currentPage: this.currentPage,
        totalPages: this.totalPages 
      });

    } catch (error) {
      console.error('Failed to start reading:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  async pause() {
    this.ttsManager.pause();
    this.isPlaying = false;
  }

  async resume() {
    this.ttsManager.resume();
    this.isPlaying = true;
  }

  async stop() {
    this.ttsManager.stop();
    this.isPlaying = false;
  }

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.onPageChange?.(this.currentPage);
      
      if (this.isPlaying && this.settings.autoAdvance) {
        // Small delay before starting next page
        setTimeout(() => {
          this.startReading();
        }, 500);
      }
    }
  }

  async previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.onPageChange?.(this.currentPage);
      
      if (this.isPlaying) {
        this.stop();
        setTimeout(() => {
          this.startReading();
        }, 500);
      }
    }
  }

  async goToPage(pageNumber) {
    if (pageNumber >= 1 && pageNumber <= this.totalPages) {
      const wasPlaying = this.isPlaying;
      if (wasPlaying) {
        this.stop();
      }
      
      this.currentPage = pageNumber;
      this.onPageChange?.(this.currentPage);
      
      if (wasPlaying) {
        setTimeout(() => {
          this.startReading();
        }, 500);
      }
    }
  }

  getPageText(pageNumber) {
    if (pageNumber < 1 || pageNumber > this.textData.length) {
      return '';
    }

    const pageItems = this.textData[pageNumber - 1];
    return pageItems
      .filter(item => item.text.trim())
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    console.log('Audiobook settings updated:', this.settings);
  }

  getAvailableVoices() {
    return this.ttsManager.getVoices();
  }

  getBestVoices() {
    return this.ttsManager.getBestVoices();
  }

  handleTTSEnd() {
    this.isPlaying = false;
    
    if (this.settings.autoAdvance && this.currentPage < this.totalPages) {
      console.log('Auto-advancing to next page...');
      this.nextPage();
    } else {
      console.log('Reading completed');
      this.onStatusChange?.({ 
        isPlaying: false, 
        currentPage: this.currentPage,
        totalPages: this.totalPages,
        completed: this.currentPage >= this.totalPages
      });
    }
  }

  handleStatusChange(status) {
    this.onStatusChange?.({ 
      ...status, 
      currentPage: this.currentPage,
      totalPages: this.totalPages 
    });
  }

  getStatus() {
    return {
      isInitialized: this.textData.length > 0,
      isPlaying: this.isPlaying,
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      settings: this.settings,
      ttsStatus: this.ttsManager.getStatus()
    };
  }

  // Save and load reading progress
  saveProgress() {
    const progress = {
      pdfUrl: this.pdfUrl,
      currentPage: this.currentPage,
      settings: this.settings,
      timestamp: Date.now()
    };
    localStorage.setItem('audiobookProgress', JSON.stringify(progress));
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem('audiobookProgress');
      if (saved) {
        const progress = JSON.parse(saved);
        if (progress.pdfUrl === this.pdfUrl) {
          this.currentPage = progress.currentPage || 1;
          this.settings = { ...this.settings, ...progress.settings };
          return progress;
        }
      }
    } catch (error) {
      console.error('Failed to load audiobook progress:', error);
    }
    return null;
  }

  // Text preprocessing for better speech
  preprocessText(text) {
    return text
      // Handle abbreviations
      .replace(/\be\.g\./g, 'for example')
      .replace(/\bi\.e\./g, 'that is')
      .replace(/\betc\./g, 'etcetera')
      .replace(/\bvs\./g, 'versus')
      .replace(/\bDr\./g, 'Doctor')
      .replace(/\bMr\./g, 'Mister')
      .replace(/\bMrs\./g, 'Missus')
      .replace(/\bMs\./g, 'Miss')
      // Handle numbers and symbols
      .replace(/\b(\d+)%/g, '$1 percent')
      .replace(/\$(\d+)/g, '$1 dollars')
      .replace(/&/g, 'and')
      // Clean up spacing
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();
  }
}