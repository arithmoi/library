/**
 * Videobook Mode Implementation
 * Real-time word highlighting synchronized with audio
 */
window.VideobookMode = class VideobookMode extends window.AudiobookMode {
  constructor(pdfUrl, pdfContainer) {
    super(pdfUrl, pdfContainer);
    this.highlighter = new window.WordHighlighter(pdfContainer);
    this.currentPageWords = [];
    this.highlightingEnabled = true;
    this.highlightMode = 'word'; // 'word' or 'sentence'
  }

  async initialize() {
    try {
      // Initialize parent audiobook mode
      await super.initialize();
      
      // Initialize word highlighter
      this.highlighter.initialize();
      
      // Override TTS manager to use word callbacks
      this.setupWordHighlighting();
      
      console.log('Videobook Mode initialized');
      return true;
    } catch (error) {
      console.error('Videobook Mode initialization failed:', error);
      throw error;
    }
  }

  setupWordHighlighting() {
    // Override the TTS manager's word callback
    const originalSpeak = this.ttsManager.speakWithWordCallback.bind(this.ttsManager);
    
    this.ttsManager.speakWithWordCallback = async (text, onWordStart, options = {}) => {
      // Prepare word data for current page
      await this.preparePageWords();
      
      // Create enhanced word callback
      const enhancedWordCallback = (word, index) => {
        if (this.highlightingEnabled) {
          this.highlightCurrentWord(word, index);
        }
        if (onWordStart) {
          onWordStart(word, index);
        }
      };
      
      return originalSpeak(text, enhancedWordCallback, options);
    };
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
      // Prepare words for highlighting
      await this.preparePageWords();
      
      const pageText = this.getPageText(this.currentPage);
      if (!pageText || pageText.trim().length === 0) {
        console.warn(`No text found on page ${this.currentPage}, skipping...`);
        if (this.settings.autoAdvance) {
          await this.nextPage();
        }
        return;
      }

      console.log(`Starting videobook reading on page ${this.currentPage}...`);
      
      // Use word callback version for highlighting
      await this.ttsManager.speakWithWordCallback(
        pageText,
        (word, index) => this.highlightCurrentWord(word, index),
        {
          rate: this.settings.speed,
          pitch: this.settings.pitch,
          volume: this.settings.volume,
          voice: this.settings.voice
        }
      );

      this.isPlaying = true;
      this.onStatusChange?.({ 
        isPlaying: true, 
        currentPage: this.currentPage,
        totalPages: this.totalPages,
        mode: 'video'
      });

    } catch (error) {
      console.error('Failed to start videobook reading:', error);
      this.isPlaying = false;
      throw error;
    }
  }

  async preparePageWords() {
    if (this.currentPage < 1 || this.currentPage > this.textData.length) {
      this.currentPageWords = [];
      return;
    }

    const pageTextItems = this.textData[this.currentPage - 1];
    this.currentPageWords = this.highlighter.extractWords(pageTextItems);
    
    console.log(`Prepared ${this.currentPageWords.length} words for highlighting on page ${this.currentPage}`);
  }

  highlightCurrentWord(word, wordIndex) {
    if (!this.highlightingEnabled || !this.currentPageWords.length) {
      return;
    }

    // Find the word in our position data
    const wordData = this.findWordByIndex(word, wordIndex);
    
    if (wordData) {
      if (this.highlightMode === 'word') {
        this.highlighter.highlightWord(wordData, this.currentPage);
      } else if (this.highlightMode === 'sentence') {
        // Highlight sentence containing this word
        const sentenceWords = this.getSentenceWords(wordIndex);
        if (sentenceWords.length > 0) {
          this.highlighter.highlightSentence(sentenceWords, this.currentPage);
        }
      }
    }
  }

  findWordByIndex(targetWord, wordIndex) {
    // Try to find word by index first
    if (wordIndex < this.currentPageWords.length) {
      const candidateWord = this.currentPageWords[wordIndex];
      if (this.wordsMatch(candidateWord.text, targetWord)) {
        return candidateWord;
      }
    }

    // Fallback: search for word by text content
    return this.currentPageWords.find(wordData => 
      this.wordsMatch(wordData.text, targetWord)
    );
  }

  wordsMatch(word1, word2) {
    // Normalize words for comparison
    const normalize = (word) => word.toLowerCase()
      .replace(/[^\w]/g, '')
      .trim();
    
    return normalize(word1) === normalize(word2);
  }

  getSentenceWords(currentWordIndex) {
    // Find sentence boundaries around current word
    const sentenceStart = this.findSentenceStart(currentWordIndex);
    const sentenceEnd = this.findSentenceEnd(currentWordIndex);
    
    return this.currentPageWords.slice(sentenceStart, sentenceEnd + 1);
  }

  findSentenceStart(wordIndex) {
    // Look backwards for sentence start
    for (let i = wordIndex; i >= 0; i--) {
      const word = this.currentPageWords[i];
      if (word && word.text.match(/[.!?]$/)) {
        return i + 1;
      }
    }
    return 0;
  }

  findSentenceEnd(wordIndex) {
    // Look forwards for sentence end
    for (let i = wordIndex; i < this.currentPageWords.length; i++) {
      const word = this.currentPageWords[i];
      if (word && word.text.match(/[.!?]$/)) {
        return i;
      }
    }
    return this.currentPageWords.length - 1;
  }

  // Override page navigation to clear highlights
  async nextPage() {
    this.highlighter.clearHighlights();
    await super.nextPage();
  }

  async previousPage() {
    this.highlighter.clearHighlights();
    await super.previousPage();
  }

  async goToPage(pageNumber) {
    this.highlighter.clearHighlights();
    await super.goToPage(pageNumber);
  }

  // Highlighting control methods
  enableHighlighting() {
    this.highlightingEnabled = true;
  }

  disableHighlighting() {
    this.highlightingEnabled = false;
    this.highlighter.clearHighlights();
  }

  setHighlightMode(mode) {
    if (['word', 'sentence'].includes(mode)) {
      this.highlightMode = mode;
      console.log(`Highlight mode set to: ${mode}`);
    }
  }

  // Interactive word clicking
  setupWordInteraction() {
    if (!this.pdfContainer) return;

    this.pdfContainer.addEventListener('click', (event) => {
      if (!this.highlightingEnabled) return;

      // Find clicked word and highlight it
      const clickedWord = this.findWordAtPosition(event.clientX, event.clientY);
      if (clickedWord) {
        this.highlighter.highlightWord(clickedWord, this.currentPage, 1000);
        
        // Optionally speak the clicked word
        if (this.settings.speakOnClick) {
          this.speakWord(clickedWord.text);
        }
      }
    });
  }

  findWordAtPosition(x, y) {
    // Convert screen coordinates to PDF coordinates
    const rect = this.pdfContainer.getBoundingClientRect();
    const pdfX = x - rect.left;
    const pdfY = y - rect.top;

    // Find word at position
    return this.currentPageWords.find(word => 
      pdfX >= word.x && pdfX <= word.x + word.width &&
      pdfY >= word.y && pdfY <= word.y + word.height
    );
  }

  async speakWord(word) {
    try {
      await this.ttsManager.speak(word, {
        rate: this.settings.speed * 0.8, // Slightly slower for single words
        pitch: this.settings.pitch,
        volume: this.settings.volume * 0.7 // Quieter for single words
      });
    } catch (error) {
      console.error('Failed to speak word:', error);
    }
  }

  // Override stop to clear highlights
  async stop() {
    this.highlighter.clearHighlights();
    await super.stop();
  }

  // Cleanup
  destroy() {
    this.highlighter.destroy();
    this.stop();
  }

  getStatus() {
    const baseStatus = super.getStatus();
    return {
      ...baseStatus,
      mode: 'video',
      highlightingEnabled: this.highlightingEnabled,
      highlightMode: this.highlightMode,
      wordsOnPage: this.currentPageWords.length
    };
  }
}