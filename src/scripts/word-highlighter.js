/**
 * Word Highlighting Overlay System
 * Creates synchronized word highlighting for video mode
 */
window.WordHighlighter = class WordHighlighter {
  constructor(pdfContainer) {
    this.container = pdfContainer;
    this.overlay = null;
    this.currentHighlights = [];
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) return;
    
    this.overlay = this.createOverlay();
    this.isInitialized = true;
    console.log('Word Highlighter initialized');
  }

  createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'word-highlight-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 10;
      overflow: hidden;
    `;
    this.container.appendChild(overlay);
    return overlay;
  }

  highlightWord(wordData, pageNumber, duration = 500) {
    if (!this.isInitialized) {
      this.initialize();
    }

    // Clear previous highlights
    this.clearHighlights();

    const highlight = document.createElement('div');
    highlight.className = 'word-highlight';
    highlight.style.cssText = `
      position: absolute;
      left: ${wordData.x}px;
      top: ${wordData.y}px;
      width: ${wordData.width}px;
      height: ${wordData.height}px;
      background: rgba(255, 255, 0, 0.4);
      border-radius: 2px;
      animation: highlightPulse 0.3s ease-in-out;
      transition: all 0.2s ease;
      box-shadow: 0 0 4px rgba(255, 255, 0, 0.6);
    `;
    
    this.overlay.appendChild(highlight);
    this.currentHighlights.push(highlight);
    
    // Remove after animation
    setTimeout(() => {
      if (highlight.parentNode) {
        highlight.remove();
      }
      const index = this.currentHighlights.indexOf(highlight);
      if (index > -1) {
        this.currentHighlights.splice(index, 1);
      }
    }, duration);

    return highlight;
  }

  highlightSentence(wordsData, pageNumber, duration = 2000) {
    if (!this.isInitialized) {
      this.initialize();
    }

    // Clear previous highlights
    this.clearHighlights();

    wordsData.forEach((wordData, index) => {
      const highlight = document.createElement('div');
      highlight.className = 'sentence-highlight';
      highlight.style.cssText = `
        position: absolute;
        left: ${wordData.x}px;
        top: ${wordData.y}px;
        width: ${wordData.width}px;
        height: ${wordData.height}px;
        background: rgba(0, 123, 255, 0.3);
        border-radius: 2px;
        animation: sentenceHighlight 0.5s ease-in-out;
        animation-delay: ${index * 0.1}s;
        opacity: 0;
      `;
      
      this.overlay.appendChild(highlight);
      this.currentHighlights.push(highlight);
    });
    
    // Remove all highlights after duration
    setTimeout(() => {
      this.clearHighlights();
    }, duration);
  }

  clearHighlights() {
    this.currentHighlights.forEach(highlight => {
      if (highlight.parentNode) {
        highlight.remove();
      }
    });
    this.currentHighlights = [];
  }

  destroy() {
    this.clearHighlights();
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.remove();
    }
    this.isInitialized = false;
  }

  // Utility method to extract words from page text items
  extractWords(pageTextItems) {
    const words = [];
    
    pageTextItems.forEach(item => {
      if (!item.text.trim()) return;
      
      const itemWords = item.text.split(/\s+/);
      const wordWidth = item.width / itemWords.length;
      
      itemWords.forEach((word, index) => {
        if (word.trim()) {
          words.push({
            text: word.trim(),
            x: item.x + (index * wordWidth),
            y: item.y,
            width: wordWidth,
            height: item.height,
            fontSize: item.fontSize || item.height,
            fontName: item.fontName
          });
        }
      });
    });
    
    return words;
  }

  // Method to find word position by text content
  findWordPosition(pageTextItems, targetWord, wordIndex = 0) {
    const words = this.extractWords(pageTextItems);
    let currentIndex = 0;
    
    for (const word of words) {
      if (word.text.toLowerCase().includes(targetWord.toLowerCase())) {
        if (currentIndex === wordIndex) {
          return word;
        }
        currentIndex++;
      }
    }
    
    return null;
  }

  // Method to highlight by word index in the page
  highlightWordByIndex(pageTextItems, wordIndex) {
    const words = this.extractWords(pageTextItems);
    if (wordIndex < words.length) {
      return this.highlightWord(words[wordIndex], 1);
    }
    return null;
  }
}

// CSS animations for highlighting effects
export const highlightStyles = `
  @keyframes highlightPulse {
    0% {
      transform: scale(1);
      background: rgba(255, 255, 0, 0.6);
    }
    50% {
      transform: scale(1.05);
      background: rgba(255, 255, 0, 0.8);
    }
    100% {
      transform: scale(1);
      background: rgba(255, 255, 0, 0.4);
    }
  }

  @keyframes sentenceHighlight {
    0% {
      opacity: 0;
      transform: translateY(-2px);
    }
    50% {
      opacity: 1;
      transform: translateY(0);
    }
    100% {
      opacity: 0.7;
      transform: translateY(0);
    }
  }

  .word-highlight {
    pointer-events: none;
    user-select: none;
  }

  .sentence-highlight {
    pointer-events: none;
    user-select: none;
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .word-highlight {
      min-width: 44px;
      min-height: 44px;
      border-radius: 4px;
    }
    
    .sentence-highlight {
      min-width: 44px;
      min-height: 44px;
      border-radius: 4px;
    }
  }
`;