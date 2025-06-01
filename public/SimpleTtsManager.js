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
    
    const hasVoices = this.availableVoices.length > 0;
    if (!hasVoices) {
      console.warn('No voices available for speech synthesis');
    }
    
    // Mark as initialized regardless of voice availability (TTS might still work)
    this.isInitialized = true;
    console.log('SimpleTtsManager initialized successfully with', this.availableVoices.length, 'voices');
    
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

  getBestVoices() {
    // Filter and rank voices by quality for better TTS experience
    const voices = this.availableVoices;
    if (voices.length === 0) return [];

    // Prioritize voices by quality indicators
    const rankedVoices = voices
      .map(voice => ({
        voice,
        score: this.calculateVoiceQuality(voice)
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.voice);

    return rankedVoices;
  }

  calculateVoiceQuality(voice) {
    let score = 0;
    const voiceName = voice.name.toLowerCase();
    const platform = this.detectPlatform();
    
    // Platform-specific high-quality voices
    if (platform === 'mac') {
      // macOS has excellent built-in voices
      if (voiceName.includes('alex')) score += 120; // Alex is very natural
      if (voiceName.includes('samantha')) score += 115;
      if (voiceName.includes('victoria')) score += 110;
      if (voiceName.includes('allison')) score += 105;
      if (voiceName.includes('ava')) score += 100;
      if (voiceName.includes('tom')) score += 95;
      if (voiceName.includes('susan')) score += 90;
    } else if (platform === 'windows') {
      // Windows has good quality voices
      if (voiceName.includes('zira')) score += 110;
      if (voiceName.includes('david')) score += 105;
      if (voiceName.includes('mark')) score += 100;
      if (voiceName.includes('hazel')) score += 95;
      if (voiceName.includes('aria')) score += 90;
    } else if (platform === 'android') {
      // Android Google voices are usually good
      if (voiceName.includes('google')) score += 100;
      if (voiceName.includes('female') || voiceName.includes('male')) score += 80;
    }
    
    // General quality indicators
    if (voiceName.includes('neural')) score += 100;
    if (voiceName.includes('premium')) score += 90;
    if (voiceName.includes('enhanced')) score += 80;
    if (voiceName.includes('natural')) score += 70;
    if (voiceName.includes('high quality')) score += 65;
    
    // Voice engine preferences
    if (voiceName.includes('google')) score += 60;
    if (voiceName.includes('microsoft')) score += 50;
    if (voiceName.includes('amazon')) score += 40;
    if (voiceName.includes('apple')) score += 55;
    
    // Language preferences
    if (voice.lang.startsWith('en-US')) score += 35; // US English preferred
    if (voice.lang.startsWith('en-GB')) score += 30; // British English
    if (voice.lang.startsWith('en')) score += 25; // Other English variants
    
    // Default and local service preferences
    if (voice.default) score += 20;
    if (voice.localService) score += 10;
    
    // Avoid obviously robotic voices
    if (voiceName.includes('robot') || voiceName.includes('synthetic')) score -= 50;
    if (voiceName.includes('espeak')) score -= 30; // Common on Linux, often robotic
    
    return score;
  }

  detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    if (userAgent.includes('mac') || platform.includes('mac')) {
      return 'mac';
    } else if (userAgent.includes('win') || platform.includes('win')) {
      return 'windows';
    } else if (userAgent.includes('android')) {
      return 'android';
    } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'ios';
    } else if (userAgent.includes('linux')) {
      return 'linux';
    }
    return 'unknown';
  }

  getOptimalRate(platform, userRate) {
    if (userRate !== undefined) return userRate;
    
    // Platform-specific optimal speaking rates for smoother playback
    switch (platform) {
      case 'mac':
        return 0.95; // Mac voices sound good at near-normal speed
      case 'windows':
        return 0.9; // Windows voices benefit from slightly slower
      case 'android':
        return 0.85; // Android voices often need slower rate
      case 'ios':
        return 0.95; // iOS voices are high quality
      case 'linux':
        return 0.85; // Slightly faster than before for better flow
      default:
        return 0.9;
    }
  }

  getOptimalPitch(platform, userPitch) {
    if (userPitch !== undefined) return userPitch;
    
    // Platform-specific optimal pitch settings
    switch (platform) {
      case 'mac':
        return 1.0; // Mac voices have good default pitch
      case 'windows':
        return 0.95; // Slightly lower pitch sounds more natural
      case 'android':
        return 0.9; // Lower pitch reduces robotic sound
      case 'ios':
        return 1.0; // iOS voices are well-tuned
      case 'linux':
        return 0.85; // Much lower pitch for Linux voices
      default:
        return 1.0;
    }
  }

  getOptimalVolume(platform, userVolume) {
    if (userVolume !== undefined) return userVolume;
    
    // Platform-specific optimal volume settings
    switch (platform) {
      case 'mac':
        return 0.9; // Mac voices can be slightly quieter
      case 'windows':
        return 0.85; // Windows voices can be harsh at full volume
      case 'android':
        return 0.8; // Android voices benefit from lower volume
      case 'ios':
        return 0.9; // iOS voices are well-balanced
      case 'linux':
        return 0.75; // Linux voices often need lower volume
      default:
        return 0.85;
    }
  }

  preprocessTextForSpeech(text) {
    // Clean and optimize text for more natural speech
    let processedText = text;
    
    // Normalize spacing for smoother speech
    processedText = processedText
      // Normalize periods - remove extra spaces that cause pauses
      .replace(/\.\s+/g, '. ')
      // Normalize commas - shorter pause
      .replace(/,\s+/g, ', ')
      // Normalize colons and semicolons
      .replace(/:\s+/g, ': ')
      .replace(/;\s+/g, '; ')
      // Handle abbreviations better
      .replace(/\be\.g\./g, 'for example')
      .replace(/\bi\.e\./g, 'that is')
      .replace(/\betc\./g, 'etcetera')
      .replace(/\bvs\./g, 'versus')
      .replace(/\bDr\./g, 'Doctor')
      .replace(/\bMr\./g, 'Mister')
      .replace(/\bMrs\./g, 'Missus')
      .replace(/\bMs\./g, 'Miss')
      // Handle numbers better
      .replace(/\b(\d+)%/g, '$1 percent')
      .replace(/\$(\d+)/g, '$1 dollars')
      // Remove excessive whitespace that can cause stuttering
      .replace(/\s+/g, ' ')
      // Remove line breaks that can cause pauses
      .replace(/\n+/g, ' ')
      .trim();
    
    return processedText;
  }

  async speak(text, options = {}) {
    if (!this.isInitialized) {
      throw new Error('TTS not initialized');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text provided for speech');
    }

    this.stop(); // Stop any current speech

    // Preprocess text for better speech quality
    const processedText = this.preprocessTextForSpeech(text.trim());
    this.currentUtterance = new SpeechSynthesisUtterance(processedText);
    
    // Platform-optimized speech parameters for more natural sound
    const platform = this.detectPlatform();
    const defaultRate = this.getOptimalRate(platform, options.rate);
    const defaultPitch = this.getOptimalPitch(platform, options.pitch);
    const defaultVolume = this.getOptimalVolume(platform, options.volume);
    
    this.currentUtterance.rate = Math.max(0.1, Math.min(10, defaultRate));
    this.currentUtterance.pitch = Math.max(0, Math.min(2, defaultPitch));
    this.currentUtterance.volume = Math.max(0, Math.min(1, defaultVolume));

    // Set voice with quality preference
    if (options.voice && this.availableVoices.includes(options.voice)) {
      this.currentUtterance.voice = options.voice;
    } else {
      // Use best available voice for quality
      const bestVoices = this.getBestVoices();
      if (bestVoices.length > 0) {
        this.currentUtterance.voice = bestVoices[0];
        console.log('Using best quality voice:', bestVoices[0].name);
      } else if (this.availableVoices.length > 0) {
        // Fallback to any available voice
        const fallbackVoice = this.availableVoices.find(voice =>
          voice.default || voice.lang.startsWith('en')
        ) || this.availableVoices[0];
        this.currentUtterance.voice = fallbackVoice;
      }
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
        
        // Handle different error types with specific messages
        if (userAgent.includes('linux')) {
          if (event.error === 'not-allowed') {
            console.warn('Linux TTS permission issue - this might be a false error');
            reject(new Error('Speech not allowed. Please check browser permissions or try a different browser.'));
          } else if (event.error === 'synthesis-failed') {
            console.warn('Linux TTS synthesis failed - likely browser compatibility issue');
            reject(new Error('synthesis-failed'));
          } else {
            reject(new Error(`Speech synthesis error: ${event.error}`));
          }
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