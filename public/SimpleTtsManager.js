/**
 * Simple Web Speech API Manager
 * Clean implementation focused on native browser TTS
 */
class SimpleTtsManager {
  constructor() {
    this.isInitialized = false;
    this.currentUtterance = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.availableVoices = [];
    this.selectedVoice = null;
    this.onStatusChange = null;
    this.onEnd = null;
  }

  async initialize() {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported in this browser');
      return false;
    }

    // Check if speech synthesis is actually functional
    if (!this.isSpeechSynthesisWorking()) {
      console.warn('Speech synthesis appears to be non-functional');
      return false;
    }

    // Load voices with retry mechanism
    await this.loadVoices();
    this.isInitialized = true;
    
    const hasVoices = this.availableVoices.length > 0;
    if (!hasVoices) {
      console.warn('No voices available for speech synthesis');
    }
    
    return hasVoices;
  }

  isSpeechSynthesisWorking() {
    try {
      // Test if speechSynthesis methods are available
      if (typeof speechSynthesis.speak !== 'function' ||
          typeof speechSynthesis.getVoices !== 'function') {
        return false;
      }
      
      // Additional check for Linux systems where speechSynthesis might exist but not work
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('linux')) {
        console.log('Linux system detected - checking voice availability...');
        // On Linux, we'll be more lenient and try to proceed
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Speech synthesis test failed:', error);
      return false;
    }
  }

  async loadVoices() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 50; // Increased for Linux systems
      
      const loadVoicesAttempt = () => {
        attempts++;
        this.availableVoices = speechSynthesis.getVoices();
        
        console.log(`Voice loading attempt ${attempts}: Found ${this.availableVoices.length} voices`);
        
        if (this.availableVoices.length > 0) {
          console.log('Available voices:', this.availableVoices.map(v => `${v.name} (${v.lang})`));
          resolve();
        } else if (attempts >= maxAttempts) {
          console.warn(`No voices found after ${maxAttempts} attempts`);
          // On Linux, sometimes voices aren't reported but TTS still works
          const userAgent = navigator.userAgent.toLowerCase();
          if (userAgent.includes('linux')) {
            console.log('Linux system: Proceeding without voice list (TTS may still work)');
          }
          resolve();
        } else {
          // Retry after a short delay
          setTimeout(loadVoicesAttempt, 100);
        }
      };

      // Handle voiceschanged event
      speechSynthesis.addEventListener('voiceschanged', loadVoicesAttempt);
      
      // Start loading immediately
      loadVoicesAttempt();
      
      // Also try to trigger voice loading on some browsers
      if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.speak(new SpeechSynthesisUtterance(''));
      }
    });
  }

  getVoices() {
    return this.availableVoices;
  }

  async speak(text, options = {}) {
    if (!this.isInitialized) {
      throw new Error('TTS not initialized');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text provided for speech');
    }

    this.stop(); // Stop any current speech

    this.currentUtterance = new SpeechSynthesisUtterance(text.trim());
    this.currentUtterance.rate = Math.max(0.1, Math.min(10, options.rate || 1.0));
    this.currentUtterance.pitch = Math.max(0, Math.min(2, options.pitch || 1.0));
    this.currentUtterance.volume = Math.max(0, Math.min(1, options.volume || 1.0));

    // Set voice if available
    if (options.voice && this.availableVoices.includes(options.voice)) {
      this.currentUtterance.voice = options.voice;
    } else if (this.availableVoices.length > 0) {
      // Try to find a good default voice
      const defaultVoice = this.availableVoices.find(voice =>
        voice.default || voice.lang.startsWith('en')
      ) || this.availableVoices[0];
      this.currentUtterance.voice = defaultVoice;
    }

    return new Promise((resolve, reject) => {
      let hasStarted = false;
      let timeoutId;

      // Set up timeout for Linux systems where events might not fire
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('linux')) {
        timeoutId = setTimeout(() => {
          if (!hasStarted) {
            console.warn('Speech start timeout on Linux - assuming speech started');
            hasStarted = true;
            this.isPlaying = true;
            this.isPaused = false;
            this.onStatusChange?.({ isPlaying: true, isPaused: false });
            resolve();
          }
        }, 1000);
      }

      this.currentUtterance.onstart = () => {
        if (timeoutId) clearTimeout(timeoutId);
        hasStarted = true;
        this.isPlaying = true;
        this.isPaused = false;
        this.onStatusChange?.({ isPlaying: true, isPaused: false });
        console.log('Speech started successfully');
        resolve();
      };

      this.currentUtterance.onend = () => {
        if (timeoutId) clearTimeout(timeoutId);
        this.isPlaying = false;
        this.isPaused = false;
        this.onStatusChange?.({ isPlaying: false, isPaused: false });
        console.log('Speech ended');
        this.onEnd?.();
      };

      this.currentUtterance.onerror = (event) => {
        if (timeoutId) clearTimeout(timeoutId);
        this.isPlaying = false;
        this.isPaused = false;
        this.onStatusChange?.({ isPlaying: false, isPaused: false });
        console.error('Speech synthesis error:', event.error);
        
        // On Linux, some "errors" might not be actual failures
        if (userAgent.includes('linux') && event.error === 'not-allowed') {
          console.warn('Linux TTS permission issue - this might be a false error');
          reject(new Error('Speech not allowed. Please check browser permissions or try a different browser.'));
        } else {
          reject(new Error(`Speech synthesis error: ${event.error}`));
        }
      };

      try {
        console.log('Starting speech synthesis...');
        speechSynthesis.speak(this.currentUtterance);
        
        // For systems without proper event support, resolve after a short delay
        if (!hasStarted && userAgent.includes('linux')) {
          setTimeout(() => {
            if (!hasStarted) {
              console.log('Fallback resolution for Linux systems');
              hasStarted = true;
              this.isPlaying = true;
              this.onStatusChange?.({ isPlaying: true, isPaused: false });
              resolve();
            }
          }, 500);
        }
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        console.error('Failed to start speech synthesis:', error);
        reject(error);
      }
    });
  }

  pause() {
    if (this.isPlaying && !this.isPaused) {
      speechSynthesis.pause();
      this.isPaused = true;
      this.onStatusChange?.({ isPlaying: true, isPaused: true });
    }
  }

  resume() {
    if (this.isPaused) {
      speechSynthesis.resume();
      this.isPaused = false;
      this.onStatusChange?.({ isPlaying: true, isPaused: false });
    }
  }

  stop() {
    if (this.isPlaying) {
      speechSynthesis.cancel();
      this.isPlaying = false;
      this.isPaused = false;
      this.currentUtterance = null;
      this.onStatusChange?.({ isPlaying: false, isPaused: false });
    }
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      hasVoices: this.availableVoices.length > 0
    };
  }
}

// Export for both module and global usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SimpleTtsManager;
} else if (typeof window !== 'undefined') {
  window.SimpleTtsManager = SimpleTtsManager;
}