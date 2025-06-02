/**
 * Universal TTS Manager
 * Enhanced client-side TTS with quality ranking and word callbacks
 */
window.UniversalTTSManager = class UniversalTTSManager {
  constructor() {
    this.fallbackChain = [
      'browserNative',
      'webSpeechAPI', 
      'speechSynthesis'
    ];
    this.isInitialized = false;
    this.currentUtterance = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.availableVoices = [];
    this.selectedVoice = null;
    this.onStatusChange = null;
    this.onEnd = null;
    this.onWordStart = null;
    this.wordTimer = null;
    this.currentWords = [];
    this.currentWordIndex = 0;
  }

  async initialize() {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported in this browser');
      return false;
    }

    // Check if speech synthesis is functional
    if (!this.isSpeechSynthesisWorking()) {
      console.warn('Speech synthesis appears to be non-functional');
      return false;
    }

    // Load voices with retry mechanism
    await this.loadVoices();
    
    const hasVoices = this.availableVoices.length > 0;
    if (!hasVoices) {
      console.warn('No voices available for speech synthesis');
    }
    
    this.isInitialized = true;
    console.log('UniversalTTSManager initialized with', this.availableVoices.length, 'voices');
    
    return hasVoices;
  }

  isSpeechSynthesisWorking() {
    try {
      if (typeof speechSynthesis.speak !== 'function' ||
          typeof speechSynthesis.getVoices !== 'function') {
        return false;
      }
      
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('linux')) {
        console.log('Linux system detected - checking voice availability...');
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
      const maxAttempts = 50;
      
      const loadVoicesAttempt = () => {
        attempts++;
        this.availableVoices = speechSynthesis.getVoices();
        
        console.log(`Voice loading attempt ${attempts}: Found ${this.availableVoices.length} voices`);
        
        if (this.availableVoices.length > 0) {
          console.log('Available voices:', this.availableVoices.map(v => `${v.name} (${v.lang})`));
          resolve();
        } else if (attempts >= maxAttempts) {
          console.warn(`No voices found after ${maxAttempts} attempts`);
          const userAgent = navigator.userAgent.toLowerCase();
          if (userAgent.includes('linux')) {
            console.log('Linux system: Proceeding without voice list (TTS may still work)');
          }
          resolve();
        } else {
          setTimeout(loadVoicesAttempt, 100);
        }
      };

      speechSynthesis.addEventListener('voiceschanged', loadVoicesAttempt);
      loadVoicesAttempt();
      
      if (speechSynthesis.getVoices().length === 0) {
        speechSynthesis.speak(new SpeechSynthesisUtterance(''));
      }
    });
  }

  async getBestVoice() {
    const voices = speechSynthesis.getVoices();
    
    // Platform-specific quality ranking
    const qualityRanking = {
      // macOS high-quality voices
      'Alex': 100, 'Samantha': 95, 'Victoria': 90, 'Allison': 85, 'Ava': 80,
      // Windows quality voices  
      'Zira': 85, 'David': 80, 'Mark': 75, 'Hazel': 70, 'Aria': 65,
      // Android Google voices
      'Google US English': 90, 'Google UK English': 85,
      // Fallback voices
      'Microsoft': 60, 'eSpeak': 30
    };
    
    return voices
      .map(voice => ({
        voice,
        score: this.calculateVoiceScore(voice, qualityRanking)
      }))
      .sort((a, b) => b.score - a.score)[0]?.voice;
  }

  calculateVoiceScore(voice, qualityRanking) {
    let score = 0;
    const voiceName = voice.name.toLowerCase();
    const platform = this.detectPlatform();
    
    // Check direct name matches
    for (const [name, points] of Object.entries(qualityRanking)) {
      if (voiceName.includes(name.toLowerCase())) {
        score += points;
        break;
      }
    }
    
    // Platform-specific bonuses
    if (platform === 'mac') {
      if (voiceName.includes('alex') || voiceName.includes('samantha')) score += 20;
    } else if (platform === 'windows') {
      if (voiceName.includes('zira') || voiceName.includes('david')) score += 15;
    } else if (platform === 'android') {
      if (voiceName.includes('google')) score += 15;
    }
    
    // Quality indicators
    if (voiceName.includes('neural')) score += 25;
    if (voiceName.includes('premium')) score += 20;
    if (voiceName.includes('enhanced')) score += 15;
    if (voiceName.includes('natural')) score += 10;
    
    // Language preferences
    if (voice.lang.startsWith('en-US')) score += 10;
    if (voice.lang.startsWith('en-GB')) score += 8;
    if (voice.lang.startsWith('en')) score += 5;
    
    // Default and local preferences
    if (voice.default) score += 5;
    if (voice.localService) score += 3;
    
    // Avoid poor quality voices
    if (voiceName.includes('robot') || voiceName.includes('synthetic')) score -= 20;
    if (voiceName.includes('espeak')) score -= 15;
    
    return score;
  }

  detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    if (userAgent.includes('mac') || platform.includes('mac')) return 'mac';
    if (userAgent.includes('win') || platform.includes('win')) return 'windows';
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    if (userAgent.includes('linux')) return 'linux';
    return 'unknown';
  }

  getVoices() {
    return this.availableVoices;
  }

  getBestVoices() {
    const voices = this.availableVoices;
    if (voices.length === 0) return [];

    return voices
      .map(voice => ({
        voice,
        score: this.calculateVoiceScore(voice, {})
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.voice);
  }

  async speakWithWordCallback(text, onWordStart, options = {}) {
    if (!this.isInitialized) {
      throw new Error('TTS not initialized');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text provided for speech');
    }

    this.stop(); // Stop any current speech

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentWords = text.split(' ');
    this.currentWordIndex = 0;
    this.onWordStart = onWordStart;
    
    // Set voice and options
    const bestVoice = await this.getBestVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
    }
    
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 0.85;

    return new Promise((resolve, reject) => {
      // Estimate word timing (since browser TTS doesn't provide word events)
      const estimatedDuration = text.length * 60; // ms per character
      const wordInterval = estimatedDuration / this.currentWords.length;
      
      utterance.onstart = () => {
        this.isPlaying = true;
        this.isPaused = false;
        this.onStatusChange?.({ isPlaying: true, isPaused: false });
        
        // Start word highlighting timer
        this.wordTimer = setInterval(() => {
          if (this.currentWordIndex < this.currentWords.length && this.onWordStart) {
            this.onWordStart(this.currentWords[this.currentWordIndex], this.currentWordIndex);
            this.currentWordIndex++;
          } else {
            clearInterval(this.wordTimer);
          }
        }, wordInterval);
        
        resolve();
      };

      utterance.onend = () => {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentWordIndex = 0;
        if (this.wordTimer) {
          clearInterval(this.wordTimer);
          this.wordTimer = null;
        }
        this.onStatusChange?.({ isPlaying: false, isPaused: false });
        this.onEnd?.();
      };

      utterance.onerror = (event) => {
        this.isPlaying = false;
        this.isPaused = false;
        if (this.wordTimer) {
          clearInterval(this.wordTimer);
          this.wordTimer = null;
        }
        this.onStatusChange?.({ isPlaying: false, isPaused: false });
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.currentUtterance = utterance;
      speechSynthesis.speak(utterance);
    });
  }

  async speak(text, options = {}) {
    return this.speakWithWordCallback(text, null, options);
  }

  pause() {
    if (this.isPlaying && !this.isPaused) {
      speechSynthesis.pause();
      this.isPaused = true;
      if (this.wordTimer) {
        clearInterval(this.wordTimer);
        this.wordTimer = null;
      }
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
      this.currentWordIndex = 0;
      if (this.wordTimer) {
        clearInterval(this.wordTimer);
        this.wordTimer = null;
      }
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