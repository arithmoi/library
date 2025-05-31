/**
 * Enhanced Browser-Native TTS Manager
 * Optimized for static website deployment (GitHub Pages)
 * Focuses on Web Speech API with robust fallbacks
 */

class TtsManager {
  constructor() {
    this.isInitialized = false;
    this.currentUtterance = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.onStatusChange = null;
    this.onError = null;
    this.onSuccess = null;
    this.userInteractionRequired = true;
    this.voicesLoaded = false;
    this.availableVoices = [];
    this.selectedVoice = null;
    this.debugMode = localStorage.getItem('tts_debug') === 'true' || true; // Enable debug by default for troubleshooting
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[TTS] ${message}`, ...args);
    }
  }

  async initialize() {
    this.log('🔊 Initializing Enhanced TTS Manager...');
    
    // Check if Web Speech API is available
    if (!window.speechSynthesis) {
      this.showNoSpeechSynthesisError();
      return false;
    }

    // Load voices with retry mechanism
    const voicesLoaded = await this.loadVoicesWithRetry();
    if (!voicesLoaded) {
      this.log('⚠️ No voices loaded, but continuing with fallback mode');
      this.showNoVoicesError();
      // Still mark as initialized to allow basic functionality
      this.isInitialized = true;
      return false; // Return false to indicate partial initialization
    }

    this.isInitialized = true;
    this.log(`✅ TTS initialized with ${this.availableVoices.length} voices`);
    
    // Test basic speech synthesis capability
    await this.testBasicSpeech();
    
    this.onSuccess?.(`Text-to-speech ready! ${this.availableVoices.length} voices available.`);
    return true;
  }

  // Enhanced voice loading with retry mechanism
  async loadVoicesWithRetry(maxAttempts = 10, delayMs = 100) {
    this.log('Loading voices...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const voices = speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        this.availableVoices = voices.map(voice => ({
          name: voice.name,
          lang: voice.lang,
          localService: voice.localService,
          default: voice.default,
          voiceURI: voice.voiceURI,
          gender: this.detectGender(voice.name),
          quality: voice.localService ? 'high' : 'network',
          voice: voice // Keep reference to original voice object
        }));
        
        this.voicesLoaded = true;
        this.log(`✅ Loaded ${voices.length} voices on attempt ${attempt}`);
        
        // Select a good default voice
        this.selectDefaultVoice();
        return true;
      }
      
      this.log(`Attempt ${attempt}/${maxAttempts}: No voices found, retrying...`);
      
      if (attempt === 1) {
        // Trigger voice loading on first attempt
        const dummy = new SpeechSynthesisUtterance('');
        speechSynthesis.speak(dummy);
        speechSynthesis.cancel();
      }
      
      // Wait for voices to load
      await new Promise(resolve => {
        if (attempt < maxAttempts) {
          const timeout = setTimeout(resolve, delayMs * attempt);
          
          speechSynthesis.addEventListener('voiceschanged', () => {
            clearTimeout(timeout);
            resolve();
          }, { once: true });
        } else {
          setTimeout(resolve, delayMs);
        }
      });
    }
    
    this.log('❌ Failed to load voices after all attempts');
    return false;
  }

  detectGender(voiceName) {
    const name = voiceName.toLowerCase();
    const femaleIndicators = ['female', 'woman', 'girl', 'zira', 'cortana', 'siri', 'alexa', 'samantha', 'victoria', 'allison', 'ava', 'emma', 'joanna', 'kendra', 'kimberly', 'salli', 'nicole', 'russell', 'amy', 'emma', 'brian'];
    const maleIndicators = ['male', 'man', 'boy', 'david', 'mark', 'richard', 'alex', 'daniel', 'matthew', 'joey', 'justin', 'kevin', 'russell', 'geraint'];
    
    if (femaleIndicators.some(indicator => name.includes(indicator))) return 'female';
    if (maleIndicators.some(indicator => name.includes(indicator))) return 'male';
    return 'neutral';
  }

  selectDefaultVoice() {
    if (this.availableVoices.length === 0) return;
    
    // Preference order: local English voices > any English voices > default voice > first voice
    let preferredVoice =
      this.availableVoices.find(v => v.localService && v.lang.startsWith('en')) ||
      this.availableVoices.find(v => v.lang.startsWith('en')) ||
      this.availableVoices.find(v => v.default) ||
      this.availableVoices[0];
    
    this.selectedVoice = preferredVoice;
    this.log(`Selected default voice: ${preferredVoice.name} (${preferredVoice.lang})`);
  }

  // Require user interaction before first TTS use
  async requireUserInteraction() {
    if (!this.userInteractionRequired) return true;
    
    return new Promise((resolve) => {
      this.showUserInteractionModal(resolve);
    });
  }

  showUserInteractionModal(callback) {
    // Remove any existing modals
    const existingModals = document.querySelectorAll('[data-tts-interaction-modal]');
    existingModals.forEach(modal => modal.remove());
    
    const modal = document.createElement('div');
    modal.setAttribute('data-tts-interaction-modal', 'true');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); z-index: 10000; display: flex;
      align-items: center; justify-content: center; font-family: Arial, sans-serif;
    `;
    
    modal.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h3 style="margin-top: 0; color: #007bff;">🔊 Enable Audio Reading</h3>
        <p style="margin: 20px 0; line-height: 1.6;">
          Click the button below to enable text-to-speech for this PDF.
          This is required by your browser for security.
        </p>
        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: left;">
          <strong>✅ Available voices:</strong> ${this.availableVoices.length}<br>
          <strong>🎤 Default voice:</strong> ${this.selectedVoice?.name || 'System default'}<br>
          <strong>🌍 Language:</strong> ${this.selectedVoice?.lang || 'Auto-detect'}
        </div>
        <button id="enable-tts-btn" style="background: #007bff; color: white; border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold;">
          🔊 Enable Audio Reading
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const enableBtn = modal.querySelector('#enable-tts-btn');
    enableBtn.addEventListener('click', () => {
      this.userInteractionRequired = false;
      modal.remove();
      this.log('✅ User interaction completed, TTS enabled');
      callback(true);
    });
  }

  // Enhanced speak method with user interaction handling
  async speak(text, options = {}) {
    if (!this.isInitialized) {
      throw new Error('TTS not initialized');
    }

    // Check if Web Speech API is still available
    if (!window.speechSynthesis) {
      throw new Error('Web Speech API not available');
    }

    // Require user interaction on first use
    if (this.userInteractionRequired) {
      const interactionGranted = await this.requireUserInteraction();
      if (!interactionGranted) {
        throw new Error('User interaction required for TTS');
      }
    }

    return this.speakWebSpeech(text, options);
  }

  speakWebSpeech(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Web Speech API not available'));
        return;
      }

      // Stop any current speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure utterance with enhanced options
      const rate = options.rate || 1.0;
      const pitch = options.pitch || 1.0;
      const volume = options.volume || 1.0;
      
      // Ensure values are valid numbers
      utterance.rate = Math.max(0.1, Math.min(10, isNaN(rate) ? 1.0 : rate));
      utterance.pitch = Math.max(0, Math.min(2, isNaN(pitch) ? 1.0 : pitch));
      utterance.volume = Math.max(0, Math.min(1, isNaN(volume) ? 1.0 : volume));
      
      this.log(`Setting speech parameters: rate=${utterance.rate}, pitch=${utterance.pitch}, volume=${utterance.volume}`);
      
      // Set voice
      if (options.voice && this.availableVoices.length > 0) {
        const voice = this.availableVoices.find(v => v.name === options.voice);
        if (voice) {
          utterance.voice = voice.voice;
          this.log(`Using voice: ${voice.name}`);
        }
      } else if (this.selectedVoice && this.selectedVoice.voice) {
        utterance.voice = this.selectedVoice.voice;
        this.log(`Using default voice: ${this.selectedVoice.name}`);
      } else {
        // Fallback: try to use any available system voice
        const systemVoices = speechSynthesis.getVoices();
        if (systemVoices.length > 0) {
          utterance.voice = systemVoices[0];
          this.log(`Using fallback system voice: ${systemVoices[0].name}`);
        } else {
          this.log(`Using browser default voice (no voices available)`);
        }
      }

      // Set up event handlers
      utterance.onstart = () => {
        this.isPlaying = true;
        this.isPaused = false;
        this.log(`🔊 Started speaking: "${text.substring(0, 50)}..."`);
        this.onStatusChange?.({
          isPlaying: true,
          isPaused: false,
          provider: 'Enhanced Web Speech API',
          voice: utterance.voice?.name || 'Default'
        });
        resolve();
      };

      utterance.onend = () => {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentUtterance = null;
        this.log('✅ Speech completed');
        this.onStatusChange?.({
          isPlaying: false,
          isPaused: false,
          provider: 'Enhanced Web Speech API'
        });
      };

      utterance.onpause = () => {
        this.isPaused = true;
        this.log('⏸️ Speech paused');
        this.onStatusChange?.({
          isPlaying: true,
          isPaused: true,
          provider: 'Enhanced Web Speech API'
        });
      };

      utterance.onresume = () => {
        this.isPaused = false;
        this.log('▶️ Speech resumed');
        this.onStatusChange?.({
          isPlaying: true,
          isPaused: false,
          provider: 'Enhanced Web Speech API'
        });
      };

      utterance.onerror = (event) => {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentUtterance = null;
        this.log(`❌ Speech error: ${event.error}`);
        
        // Provide helpful error messages
        let errorMessage = `Speech error: ${event.error}`;
        if (event.error === 'network') {
          errorMessage = 'Network error - please check your internet connection';
        } else if (event.error === 'synthesis-failed') {
          errorMessage = 'Speech synthesis failed - try a different voice';
        } else if (event.error === 'audio-busy') {
          errorMessage = 'Audio system busy - please try again';
        }
        
        this.onError?.(errorMessage);
        reject(new Error(errorMessage));
      };

      this.currentUtterance = utterance;
      
      try {
        // Debug information
        this.log(`🎤 About to speak with:`, {
          text: text.substring(0, 50) + '...',
          voice: utterance.voice?.name || 'browser default',
          rate: utterance.rate,
          pitch: utterance.pitch,
          volume: utterance.volume,
          voicesAvailable: speechSynthesis.getVoices().length
        });
        
        speechSynthesis.speak(utterance);
        this.log(`🎤 Speech queued successfully`);
      } catch (error) {
        this.log(`❌ Failed to start speech: ${error.message}`);
        reject(error);
      }
    });
  }

  stop() {
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
      this.isPlaying = false;
      this.isPaused = false;
      this.currentUtterance = null;
      this.log('⏹️ Speech stopped');
    }
  }

  pause() {
    if (window.speechSynthesis && speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      this.log('⏸️ Speech paused');
    }
  }

  resume() {
    if (window.speechSynthesis && speechSynthesis.paused) {
      speechSynthesis.resume();
      this.log('▶️ Speech resumed');
    }
  }

  getVoices() {
    return this.availableVoices;
  }

  // Error handling methods
  showNoSpeechSynthesisError() {
    const guidance = {
      title: '❌ Speech Synthesis Not Supported',
      message: `
        <div style="text-align: left; line-height: 1.6;">
          <p><strong>Your browser doesn't support text-to-speech.</strong></p>
          
          <h4>🌐 Recommended Browsers</h4>
          <ul>
            <li><strong>Chrome/Chromium:</strong> Full TTS support</li>
            <li><strong>Firefox:</strong> Good TTS support</li>
            <li><strong>Safari:</strong> Excellent TTS support</li>
            <li><strong>Edge:</strong> Full TTS support</li>
          </ul>
          
          <h4>📱 Alternative Options</h4>
          <ul>
            <li>Use <a href="https://ttsreader.com" target="_blank">TTSReader.com</a> - Copy text and paste</li>
            <li>Install "Read Aloud" browser extension</li>
            <li>Use your device's built-in screen reader</li>
          </ul>
        </div>
      `
    };
    this.onError?.(guidance);
  }

  showNoVoicesError() {
    const userAgent = navigator.userAgent.toLowerCase();
    let systemInstructions = '';
    
    if (userAgent.includes('linux')) {
      systemInstructions = `
        <h4>🐧 Linux Setup</h4>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <strong>Install TTS voices:</strong><br>
          <code>sudo apt install espeak espeak-data</code><br>
          <code>sudo apt install festival festvox-kallpc16k</code><br>
          <em>Then restart your browser</em>
        </div>
      `;
    } else if (userAgent.includes('windows')) {
      systemInstructions = `
        <h4>🪟 Windows Setup</h4>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <strong>Enable Narrator:</strong><br>
          Settings → Ease of Access → Narrator → Turn on<br>
          <em>Then restart your browser</em>
        </div>
      `;
    } else if (userAgent.includes('mac')) {
      systemInstructions = `
        <h4>🍎 macOS Setup</h4>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
          <strong>Enable VoiceOver:</strong><br>
          System Preferences → Accessibility → VoiceOver<br>
          <em>Then restart your browser</em>
        </div>
      `;
    }

    const guidance = {
      title: '🔊 No Text-to-Speech Voices Available',
      message: `
        <div style="text-align: left; line-height: 1.6;">
          <p><strong>Your system doesn't have TTS voices installed.</strong></p>
          
          ${systemInstructions}
          
          <h4>🌐 Immediate Solutions</h4>
          <ul>
            <li><strong>Online TTS:</strong> <a href="https://ttsreader.com" target="_blank">TTSReader.com</a></li>
            <li><strong>Browser Extension:</strong> Install "Read Aloud" extension</li>
            <li><strong>Copy Mode:</strong> Copy text to external TTS service</li>
          </ul>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <strong>💡 Quick Test:</strong><br>
            Open browser console (F12) and run:<br>
            <code>speechSynthesis.getVoices().length</code><br>
            If it returns 0, you need to install system voices.
          </div>
        </div>
      `,
      actions: [
        {
          text: '🔄 Retry After Setup',
          action: () => this.initialize()
        },
        {
          text: '📋 Enable Copy Mode',
          action: () => this.enableCopyMode()
        }
      ]
    };

    this.onError?.(guidance);
  }

  enableCopyMode() {
    this.onSuccess?.('Copy mode enabled - select text to copy to external TTS services');
  }

  // Voice selection methods
  setVoice(voiceName) {
    const voice = this.availableVoices.find(v => v.name === voiceName);
    if (voice) {
      this.selectedVoice = voice;
      this.log(`Voice changed to: ${voice.name}`);
      return true;
    }
    return false;
  }

  getSelectedVoice() {
    return this.selectedVoice;
  }

  // Status methods
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      voicesLoaded: this.voicesLoaded,
      voiceCount: this.availableVoices.length,
      selectedVoice: this.selectedVoice?.name || null,
      userInteractionRequired: this.userInteractionRequired,
      provider: 'Enhanced Web Speech API'
    };
  }

  // Utility methods
  async testBasicSpeech() {
    this.log('🧪 Testing basic speech synthesis...');
    
    return new Promise((resolve) => {
      try {
        const testUtterance = new SpeechSynthesisUtterance('');
        testUtterance.volume = 0; // Silent test
        testUtterance.rate = 1.0;
        testUtterance.pitch = 1.0;
        
        testUtterance.onstart = () => {
          this.log('✅ Basic speech synthesis test passed');
          speechSynthesis.cancel(); // Stop the silent test
          resolve(true);
        };
        
        testUtterance.onerror = (event) => {
          this.log(`❌ Basic speech synthesis test failed: ${event.error}`);
          resolve(false);
        };
        
        testUtterance.onend = () => {
          resolve(true);
        };
        
        // Timeout after 2 seconds
        setTimeout(() => {
          speechSynthesis.cancel();
          this.log('⏰ Basic speech synthesis test timed out');
          resolve(false);
        }, 2000);
        
        speechSynthesis.speak(testUtterance);
        
      } catch (error) {
        this.log(`❌ Basic speech synthesis test error: ${error.message}`);
        resolve(false);
      }
    });
  }

  async testVoice(voiceName = null) {
    const testText = "Testing voice quality and responsiveness.";
    const voice = voiceName ? this.availableVoices.find(v => v.name === voiceName) : this.selectedVoice;
    
    try {
      await this.speak(testText, { voice: voice?.name });
      return true;
    } catch (error) {
      this.log(`Voice test failed: ${error.message}`);
      return false;
    }
  }

  // Cleanup method
  destroy() {
    this.stop();
    this.isInitialized = false;
    this.voicesLoaded = false;
    this.availableVoices = [];
    this.selectedVoice = null;
    this.userInteractionRequired = true;
    
    // Remove any modals
    const modals = document.querySelectorAll('[data-tts-interaction-modal]');
    modals.forEach(modal => modal.remove());
    
    this.log('TTS Manager destroyed');
  }
}

// Export for use in Astro component
window.TtsManager = TtsManager;