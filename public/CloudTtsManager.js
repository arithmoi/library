/**
 * Cloud TTS Manager for Static Websites
 * Works without requiring users to install anything
 * Uses cloud APIs to generate audio that plays directly in browser
 */

class CloudTtsManager {
  constructor() {
    this.isInitialized = false;
    this.currentProvider = null;
    this.providers = [];
    this.currentAudio = null;
    this.isPlaying = false;
    this.onStatusChange = null;
    this.onEnd = null;
    this.onError = null;
    this.onSuccess = null;
    this.debugMode = localStorage.getItem('tts_debug') === 'true' || true;
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[CloudTTS] ${message}`, ...args);
    }
  }

  async initialize() {
    this.log('🌐 Initializing Cloud TTS Manager...');
    
    // Register cloud providers that work without user downloads
    this.registerProviders();
    
    // Test providers and find the best one
    for (const provider of this.providers) {
      try {
        this.log(`Testing provider: ${provider.name}`);
        const isAvailable = await provider.test();
        if (isAvailable) {
          this.currentProvider = provider;
          this.log(`✅ Cloud TTS Provider selected: ${provider.name}`);
          this.isInitialized = true;
          this.onSuccess?.(`Text-to-speech ready using ${provider.name} - no downloads required!`);
          return true;
        }
      } catch (error) {
        this.log(`❌ Provider ${provider.name} failed:`, error.message);
      }
    }
    
    // If no cloud providers work, show guidance
    this.log('⚠️ No cloud TTS providers available, falling back to browser TTS');
    this.showCloudTtsGuidance();
    return false;
  }

  registerProviders() {
    this.providers = [
      {
        name: 'ResponsiveVoice',
        test: () => this.testResponsiveVoice(),
        speak: (text, options) => this.speakWithResponsiveVoice(text, options)
      },
      {
        name: 'Web Speech API',
        test: () => this.testWebSpeechAPI(),
        speak: (text, options) => this.speakWithWebSpeechAPI(text, options)
      },
      {
        name: 'SpeechSynthesis Enhanced',
        test: () => this.testSpeechSynthesisEnhanced(),
        speak: (text, options) => this.speakWithSpeechSynthesisEnhanced(text, options)
      }
    ];
  }

  async testResponsiveVoice() {
    // Try to load ResponsiveVoice if not already loaded
    if (!window.responsiveVoice) {
      try {
        await this.loadResponsiveVoice();
      } catch (error) {
        return false;
      }
    }
    
    return window.responsiveVoice && window.responsiveVoice.voiceSupport();
  }

  async loadResponsiveVoice() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://code.responsivevoice.org/responsivevoice.js?key=FREE';
      script.onload = () => {
        // Wait for ResponsiveVoice to initialize
        const checkReady = () => {
          if (window.responsiveVoice && window.responsiveVoice.voiceSupport()) {
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      };
      script.onerror = reject;
      document.head.appendChild(script);
      
      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('ResponsiveVoice load timeout')), 5000);
    });
  }

  async testWebSpeechAPI() {
    if (!window.speechSynthesis) return false;
    
    // Try to get voices with multiple strategies
    const voices = await this.getVoicesWithRetry();
    return voices.length > 0;
  }

  async getVoicesWithRetry() {
    // Strategy 1: Direct call
    let voices = speechSynthesis.getVoices();
    if (voices.length > 0) return voices;

    // Strategy 2: Trigger with dummy utterance
    const dummy = new SpeechSynthesisUtterance('');
    speechSynthesis.speak(dummy);
    speechSynthesis.cancel();

    // Strategy 3: Wait for voiceschanged event
    return new Promise(resolve => {
      let attempts = 0;
      const maxAttempts = 10;
      
      const checkVoices = () => {
        voices = speechSynthesis.getVoices();
        attempts++;
        
        if (voices.length > 0 || attempts >= maxAttempts) {
          resolve(voices);
        } else {
          setTimeout(checkVoices, 100);
        }
      };
      
      speechSynthesis.addEventListener('voiceschanged', () => {
        resolve(speechSynthesis.getVoices());
      }, { once: true });
      
      setTimeout(checkVoices, 50);
    });
  }

  async testSpeechSynthesisEnhanced() {
    if (!window.speechSynthesis) return false;
    
    // Enhanced testing with platform-specific optimizations
    const platform = this.detectPlatform();
    
    switch (platform) {
      case 'android':
        return this.testAndroidSpeech();
      case 'ios':
        return this.testIOSSpeech();
      case 'windows':
        return this.testWindowsSpeech();
      case 'macos':
        return this.testMacOSSpeech();
      case 'linux':
        return this.testLinuxSpeech();
      default:
        return this.testGenericSpeech();
    }
  }

  detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    if (/android/.test(userAgent)) return 'android';
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/win/.test(platform)) return 'windows';
    if (/mac/.test(platform)) return 'macos';
    if (/linux/.test(platform)) return 'linux';
    return 'unknown';
  }

  async testAndroidSpeech() {
    // Android often needs time for voices to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    return speechSynthesis.getVoices().length > 0;
  }

  async testIOSSpeech() {
    // iOS Safari usually has voices available immediately
    return speechSynthesis.getVoices().length > 0;
  }

  async testWindowsSpeech() {
    // Windows may need a trigger
    const dummy = new SpeechSynthesisUtterance('test');
    speechSynthesis.speak(dummy);
    speechSynthesis.cancel();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    return speechSynthesis.getVoices().length > 0;
  }

  async testMacOSSpeech() {
    // macOS usually works well
    return speechSynthesis.getVoices().length > 0;
  }

  async testLinuxSpeech() {
    // Linux often has issues, try multiple approaches
    for (let i = 0; i < 3; i++) {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) return true;
      
      const utterance = new SpeechSynthesisUtterance('');
      speechSynthesis.speak(utterance);
      speechSynthesis.cancel();
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    return speechSynthesis.getVoices().length > 0;
  }

  async testGenericSpeech() {
    return speechSynthesis.getVoices().length > 0;
  }

  async speak(text, options = {}) {
    if (!this.isInitialized || !this.currentProvider) {
      throw new Error('Cloud TTS not initialized');
    }

    this.log(`🔊 Speaking with ${this.currentProvider.name}: "${text.substring(0, 50)}..."`);
    
    try {
      await this.currentProvider.speak(text, options);
    } catch (error) {
      this.log(`❌ Speech failed with ${this.currentProvider.name}:`, error.message);
      
      // Try fallback providers
      await this.tryFallbackProviders(text, options);
    }
  }

  async tryFallbackProviders(text, options) {
    const currentIndex = this.providers.indexOf(this.currentProvider);
    
    for (let i = currentIndex + 1; i < this.providers.length; i++) {
      const provider = this.providers[i];
      
      try {
        this.log(`🔄 Trying fallback provider: ${provider.name}`);
        const isAvailable = await provider.test();
        
        if (isAvailable) {
          this.currentProvider = provider;
          await provider.speak(text, options);
          return;
        }
      } catch (error) {
        this.log(`❌ Fallback provider ${provider.name} failed:`, error.message);
      }
    }
    
    // All providers failed
    this.onError?.('All TTS providers failed. Please try refreshing the page or use a different browser.');
  }

  async speakWithResponsiveVoice(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!window.responsiveVoice) {
        reject(new Error('ResponsiveVoice not available'));
        return;
      }

      this.stop(); // Stop any current speech

      const voiceOptions = {
        rate: options.rate || 1.0,
        pitch: options.pitch || 1.0,
        volume: options.volume || 1.0,
        onstart: () => {
          this.isPlaying = true;
          this.onStatusChange?.({ isPlaying: true, provider: 'ResponsiveVoice' });
          resolve();
        },
        onend: () => {
          this.isPlaying = false;
          this.onStatusChange?.({ isPlaying: false, provider: 'ResponsiveVoice' });
          this.onEnd?.();
        },
        onerror: (error) => {
          this.isPlaying = false;
          this.onStatusChange?.({ isPlaying: false, provider: 'ResponsiveVoice' });
          reject(new Error(`ResponsiveVoice error: ${error}`));
        }
      };

      try {
        responsiveVoice.speak(text, "US English Female", voiceOptions);
      } catch (error) {
        reject(error);
      }
    });
  }

  async speakWithWebSpeechAPI(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Web Speech API not available'));
        return;
      }

      this.stop(); // Stop any current speech

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure utterance
      utterance.rate = Math.max(0.1, Math.min(10, options.rate || 1.0));
      utterance.pitch = Math.max(0, Math.min(2, options.pitch || 1.0));
      utterance.volume = Math.max(0, Math.min(1, options.volume || 1.0));
      
      // Try to set a good voice
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        utterance.voice = englishVoice;
      }

      utterance.onstart = () => {
        this.isPlaying = true;
        this.onStatusChange?.({ isPlaying: true, provider: 'Web Speech API' });
        resolve();
      };

      utterance.onend = () => {
        this.isPlaying = false;
        this.onStatusChange?.({ isPlaying: false, provider: 'Web Speech API' });
        this.onEnd?.();
      };

      utterance.onerror = (event) => {
        this.isPlaying = false;
        this.onStatusChange?.({ isPlaying: false, provider: 'Web Speech API' });
        reject(new Error(`Web Speech API error: ${event.error}`));
      };

      try {
        speechSynthesis.speak(utterance);
      } catch (error) {
        reject(error);
      }
    });
  }

  async speakWithSpeechSynthesisEnhanced(text, options = {}) {
    // Enhanced version with platform-specific optimizations
    const platform = this.detectPlatform();
    
    switch (platform) {
      case 'android':
        return this.speakAndroid(text, options);
      case 'ios':
        return this.speakIOS(text, options);
      case 'windows':
        return this.speakWindows(text, options);
      case 'macos':
        return this.speakMacOS(text, options);
      case 'linux':
        return this.speakLinux(text, options);
      default:
        return this.speakWithWebSpeechAPI(text, options);
    }
  }

  async speakAndroid(text, options) {
    // Android-specific optimizations
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = Math.min(options.rate || 1.0, 2.0); // Android can be sensitive to high rates
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;
      
      utterance.onstart = () => {
        this.isPlaying = true;
        this.onStatusChange?.({ isPlaying: true, provider: 'Android TTS' });
        resolve();
      };

      utterance.onend = () => {
        this.isPlaying = false;
        this.onStatusChange?.({ isPlaying: false, provider: 'Android TTS' });
        this.onEnd?.();
      };

      utterance.onerror = (event) => {
        this.isPlaying = false;
        reject(new Error(`Android TTS error: ${event.error}`));
      };

      speechSynthesis.speak(utterance);
    });
  }

  async speakIOS(text, options) {
    // iOS-specific optimizations
    return this.speakWithWebSpeechAPI(text, options);
  }

  async speakWindows(text, options) {
    // Windows-specific optimizations
    return this.speakWithWebSpeechAPI(text, options);
  }

  async speakMacOS(text, options) {
    // macOS-specific optimizations
    return this.speakWithWebSpeechAPI(text, options);
  }

  async speakLinux(text, options) {
    // Linux-specific optimizations with fallbacks
    try {
      return await this.speakWithWebSpeechAPI(text, options);
    } catch (error) {
      // Linux fallback: try ResponsiveVoice
      if (window.responsiveVoice) {
        return this.speakWithResponsiveVoice(text, options);
      }
      throw error;
    }
  }

  stop() {
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }
    
    if (window.responsiveVoice) {
      responsiveVoice.cancel();
    }
    
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    
    this.isPlaying = false;
    this.onStatusChange?.({ isPlaying: false });
  }

  pause() {
    if (window.speechSynthesis && speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      this.onStatusChange?.({ isPlaying: true, isPaused: true });
    }
    
    if (window.responsiveVoice && responsiveVoice.isPlaying()) {
      responsiveVoice.pause();
      this.onStatusChange?.({ isPlaying: true, isPaused: true });
    }
  }

  resume() {
    if (window.speechSynthesis && speechSynthesis.paused) {
      speechSynthesis.resume();
      this.onStatusChange?.({ isPlaying: true, isPaused: false });
    }
    
    if (window.responsiveVoice) {
      responsiveVoice.resume();
      this.onStatusChange?.({ isPlaying: true, isPaused: false });
    }
  }

  getVoices() {
    if (this.currentProvider?.name === 'ResponsiveVoice') {
      return [
        { name: 'US English Female', lang: 'en-US' },
        { name: 'US English Male', lang: 'en-US' },
        { name: 'UK English Female', lang: 'en-GB' },
        { name: 'UK English Male', lang: 'en-GB' }
      ];
    }
    
    if (window.speechSynthesis) {
      return speechSynthesis.getVoices().map(voice => ({
        name: voice.name,
        lang: voice.lang,
        localService: voice.localService,
        default: voice.default
      }));
    }
    
    return [];
  }

  showCloudTtsGuidance() {
    const guidance = {
      title: '🌐 Cloud Text-to-Speech Setup',
      message: `
        <div style="text-align: left; line-height: 1.6;">
          <p><strong>No local TTS voices found. Using cloud alternatives:</strong></p>
          
          <h4>🔧 Quick Solutions</h4>
          <ul>
            <li><strong>Refresh the page:</strong> Sometimes voices load after a refresh</li>
            <li><strong>Try a different browser:</strong> Chrome, Firefox, Safari, or Edge</li>
            <li><strong>Enable JavaScript:</strong> Required for cloud TTS services</li>
          </ul>
          
          <h4>🌐 Cloud TTS Services</h4>
          <ul>
            <li><strong>ResponsiveVoice:</strong> Loading automatically...</li>
            <li><strong>Web Speech API:</strong> Browser-based TTS</li>
            <li><strong>Enhanced Synthesis:</strong> Platform-optimized TTS</li>
          </ul>
          
          <h4>📱 Platform-Specific Tips</h4>
          <ul>
            <li><strong>Mobile:</strong> Use Safari (iOS) or Chrome (Android)</li>
            <li><strong>Desktop:</strong> Chrome or Firefox work best</li>
            <li><strong>Linux:</strong> May need espeak: <code>sudo apt install espeak</code></li>
          </ul>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <strong>💡 This system works without downloads!</strong><br>
            Cloud TTS provides speech synthesis without requiring system voice installation.
          </div>
        </div>
      `
    };
    
    this.onError?.(guidance);
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isPlaying: this.isPlaying,
      currentProvider: this.currentProvider?.name || null,
      availableProviders: this.providers.map(p => p.name),
      platform: this.detectPlatform()
    };
  }

  destroy() {
    this.stop();
    this.isInitialized = false;
    this.currentProvider = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CloudTtsManager;
} else if (typeof window !== 'undefined') {
  window.CloudTtsManager = CloudTtsManager;
}