/**
 * Universal TTS Manager
 * Cross-platform text-to-speech solution for static websites
 * Supports Web Speech API + Cloud TTS fallbacks + ResponsiveVoice
 * Works on GitHub Pages without requiring system voice installation
 */

class UniversalTtsManager {
  constructor() {
    this.isInitialized = false;
    this.currentUtterance = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.onStatusChange = null;
    this.onError = null;
    this.onSuccess = null;
    this.userInteractionRequired = true;
    this.debugMode = true;
    
    // TTS Providers
    this.providers = {
      responsiveVoice: { available: false, loaded: false, priority: 1 },
      webSpeech: { available: false, voices: [], priority: 2 },
      speechSynthesis: { available: false, voices: [], priority: 3 },
      cloudTts: { available: true, services: [], priority: 4 }
    };
    
    this.selectedProvider = null;
    this.selectedVoice = null;
    this.fallbackMode = false;
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[UniversalTTS] ${message}`, ...args);
    }
  }

  async initialize() {
    this.log('🚀 Initializing Universal TTS Manager...');
    
    // Initialize all available providers in priority order
    await this.initializeProviders();
    
    // Select best available provider
    this.selectBestProvider();
    
    if (!this.selectedProvider) {
      this.showNoTtsAvailableError();
      return false;
    }
    
    this.isInitialized = true;
    this.log(`✅ TTS initialized with provider: ${this.selectedProvider}`);
    this.onSuccess?.(`Text-to-speech ready! Using ${this.selectedProvider} provider.`);
    return true;
  }

  async initializeProviders() {
    // 1. Try ResponsiveVoice first (highest priority for static sites)
    await this.initializeResponsiveVoice();
    
    // 2. Check Web Speech API
    await this.initializeWebSpeech();
    
    // 3. Check enhanced Speech Synthesis
    await this.initializeEnhancedSpeechSynthesis();
    
    // 4. Initialize cloud TTS options (always available as fallback)
    await this.initializeCloudTts();
  }

  async initializeResponsiveVoice() {
    this.log('🎤 Checking ResponsiveVoice...');
    
    // Check if ResponsiveVoice is already available
    if (window.responsiveVoice && window.responsiveVoice.voiceSupport()) {
      this.providers.responsiveVoice = {
        available: true,
        loaded: true,
        priority: 1
      };
      this.log('✅ ResponsiveVoice already loaded and ready');
      return;
    }

    // Try to load ResponsiveVoice dynamically
    try {
      await this.loadResponsiveVoice();
      this.providers.responsiveVoice = {
        available: true,
        loaded: true,
        priority: 1
      };
      this.log('✅ ResponsiveVoice loaded dynamically');
    } catch (error) {
      this.log('⚠️ ResponsiveVoice not available:', error.message);
    }
  }

  async loadResponsiveVoice() {
    return new Promise((resolve, reject) => {
      // Check if already loading
      if (document.querySelector('script[src*="responsivevoice"]')) {
        // Wait for it to load
        const checkReady = () => {
          if (window.responsiveVoice && window.responsiveVoice.voiceSupport()) {
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        setTimeout(checkReady, 100);
        return;
      }

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
      script.onerror = () => reject(new Error('Failed to load ResponsiveVoice'));
      document.head.appendChild(script);
      
      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('ResponsiveVoice load timeout')), 10000);
    });
  }

  async initializeWebSpeech() {
    if (!window.speechSynthesis) {
      this.log('❌ Web Speech API not available');
      return;
    }

    this.log('🔍 Checking Web Speech API...');
    
    // Enhanced voice loading with multiple strategies
    const voices = await this.loadVoicesEnhanced();
    
    if (voices.length > 0) {
      this.providers.webSpeech = {
        available: true,
        voices: voices.map(voice => ({
          name: voice.name,
          lang: voice.lang,
          localService: voice.localService,
          default: voice.default,
          voiceURI: voice.voiceURI,
          voice: voice
        })),
        priority: 2
      };
      this.log(`✅ Web Speech API: ${voices.length} voices available`);
    } else {
      this.log('⚠️ Web Speech API: No voices available');
    }
  }

  async loadVoicesEnhanced() {
    const strategies = [
      () => this.loadVoicesStandard(),
      () => this.loadVoicesWithTrigger(),
      () => this.loadVoicesWithDelay(),
      () => this.loadVoicesWithUserAgent()
    ];

    for (const strategy of strategies) {
      const voices = await strategy();
      if (voices.length > 0) {
        this.log(`✅ Voices loaded using strategy`);
        return voices;
      }
    }

    return [];
  }

  async loadVoicesStandard() {
    return speechSynthesis.getVoices();
  }

  async loadVoicesWithTrigger() {
    // Trigger voice loading
    const dummy = new SpeechSynthesisUtterance('');
    speechSynthesis.speak(dummy);
    speechSynthesis.cancel();
    
    return new Promise(resolve => {
      let attempts = 0;
      const maxAttempts = 10;
      
      const checkVoices = () => {
        const voices = speechSynthesis.getVoices();
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

  async loadVoicesWithDelay() {
    await new Promise(resolve => setTimeout(resolve, 500));
    return speechSynthesis.getVoices();
  }

  async loadVoicesWithUserAgent() {
    // Some browsers need specific handling
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome')) {
      // Chrome-specific voice loading
      await new Promise(resolve => {
        if (speechSynthesis.getVoices().length > 0) {
          resolve();
        } else {
          speechSynthesis.addEventListener('voiceschanged', resolve, { once: true });
          setTimeout(resolve, 1000);
        }
      });
    }
    
    return speechSynthesis.getVoices();
  }

  async initializeEnhancedSpeechSynthesis() {
    // Enhanced speech synthesis with platform-specific optimizations
    if (!window.speechSynthesis) return;

    const platform = this.detectPlatform();
    this.log(`🖥️ Detected platform: ${platform}`);

    // Platform-specific voice loading
    let voices = [];
    switch (platform) {
      case 'android':
        voices = await this.loadAndroidVoices();
        break;
      case 'ios':
        voices = await this.loadIOSVoices();
        break;
      case 'windows':
        voices = await this.loadWindowsVoices();
        break;
      case 'macos':
        voices = await this.loadMacOSVoices();
        break;
      case 'linux':
        voices = await this.loadLinuxVoices();
        break;
      default:
        voices = await this.loadGenericVoices();
    }

    if (voices.length > 0) {
      this.providers.speechSynthesis = {
        available: true,
        voices: voices,
        priority: 3
      };
      this.log(`✅ Enhanced Speech Synthesis: ${voices.length} voices`);
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

  async loadAndroidVoices() {
    // Android-specific voice loading
    await new Promise(resolve => setTimeout(resolve, 1000));
    return speechSynthesis.getVoices();
  }

  async loadIOSVoices() {
    // iOS-specific voice loading
    return new Promise(resolve => {
      const checkVoices = () => {
        const voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
          resolve(voices);
        } else {
          setTimeout(checkVoices, 200);
        }
      };
      checkVoices();
    });
  }

  async loadWindowsVoices() {
    // Windows-specific voice loading
    const dummy = new SpeechSynthesisUtterance('test');
    speechSynthesis.speak(dummy);
    speechSynthesis.cancel();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    return speechSynthesis.getVoices();
  }

  async loadMacOSVoices() {
    // macOS-specific voice loading
    return speechSynthesis.getVoices();
  }

  async loadLinuxVoices() {
    // Linux-specific voice loading with multiple attempts
    for (let i = 0; i < 5; i++) {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) return voices;
      
      // Try triggering voice loading
      const utterance = new SpeechSynthesisUtterance('');
      speechSynthesis.speak(utterance);
      speechSynthesis.cancel();
      
      await new Promise(resolve => setTimeout(resolve, 200 * (i + 1)));
    }
    return speechSynthesis.getVoices();
  }

  async loadGenericVoices() {
    return speechSynthesis.getVoices();
  }

  async initializeCloudTts() {
    // Initialize cloud TTS services for ultimate fallback
    this.providers.cloudTts = {
      available: true,
      services: [
        {
          name: 'TTSReader',
          url: 'https://ttsreader.com',
          type: 'redirect'
        },
        {
          name: 'NaturalReaders',
          url: 'https://www.naturalreaders.com/online/',
          type: 'redirect'
        },
        {
          name: 'ReadSpeaker',
          url: 'https://www.readspeaker.com/demo/',
          type: 'redirect'
        }
      ],
      priority: 4
    };
  }

  selectBestProvider() {
    // Priority order: ResponsiveVoice > Web Speech API > Enhanced Speech Synthesis > Cloud TTS
    const sortedProviders = Object.entries(this.providers)
      .filter(([_, provider]) => provider.available)
      .sort(([_, a], [__, b]) => a.priority - b.priority);

    for (const [name, provider] of sortedProviders) {
      if (name === 'responsiveVoice' && provider.available) {
        this.selectedProvider = 'responsiveVoice';
        this.selectedVoice = { name: 'ResponsiveVoice Default' };
        break;
      } else if ((name === 'webSpeech' || name === 'speechSynthesis') && provider.voices?.length > 0) {
        this.selectedProvider = name;
        this.selectedVoice = this.selectBestVoice(provider.voices);
        break;
      } else if (name === 'cloudTts' && provider.available) {
        this.selectedProvider = 'cloudTts';
        this.selectedVoice = { name: 'Cloud TTS Service' };
        break;
      }
    }

    this.log(`🎯 Selected provider: ${this.selectedProvider}`);
    this.log(`🎤 Selected voice: ${this.selectedVoice?.name || 'Default'}`);
  }

  selectBestVoice(voices) {
    // Preference: local English voices > any English voices > default > first available
    return voices.find(v => v.localService && v.lang.startsWith('en')) ||
           voices.find(v => v.lang.startsWith('en')) ||
           voices.find(v => v.default) ||
           voices[0];
  }

  async speak(text, options = {}) {
    if (!this.isInitialized) {
      throw new Error('TTS not initialized');
    }

    // Require user interaction on first use
    if (this.userInteractionRequired) {
      const interactionGranted = await this.requireUserInteraction();
      if (!interactionGranted) {
        throw new Error('User interaction required for TTS');
      }
    }

    // Route to appropriate provider
    switch (this.selectedProvider) {
      case 'responsiveVoice':
        return this.speakWithResponsiveVoice(text, options);
      case 'webSpeech':
      case 'speechSynthesis':
        return this.speakWithWebSpeech(text, options);
      case 'cloudTts':
        return this.speakWithCloudTts(text, options);
      default:
        throw new Error('No TTS provider available');
    }
  }

  async speakWithResponsiveVoice(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!window.responsiveVoice) {
        reject(new Error('ResponsiveVoice not available'));
        return;
      }

      this.stop();

      const voiceOptions = {
        rate: options.rate || 1.0,
        pitch: options.pitch || 1.0,
        volume: options.volume || 1.0,
        onstart: () => {
          this.isPlaying = true;
          this.log(`🔊 ResponsiveVoice started: "${text.substring(0, 50)}..."`);
          this.onStatusChange?.({
            isPlaying: true,
            isPaused: false,
            provider: 'ResponsiveVoice'
          });
          resolve();
        },
        onend: () => {
          this.isPlaying = false;
          this.log('✅ ResponsiveVoice completed');
          this.onStatusChange?.({
            isPlaying: false,
            isPaused: false,
            provider: 'ResponsiveVoice'
          });
        },
        onerror: (error) => {
          this.isPlaying = false;
          this.log(`❌ ResponsiveVoice error: ${error}`);
          this.onStatusChange?.({
            isPlaying: false,
            isPaused: false,
            provider: 'ResponsiveVoice'
          });
          this.tryFallbackProvider(text, options, reject);
        }
      };

      try {
        // Use high-quality voice
        responsiveVoice.speak(text, "US English Female", voiceOptions);
      } catch (error) {
        this.tryFallbackProvider(text, options, reject);
      }
    });
  }

  async speakWithWebSpeech(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Web Speech API not available'));
        return;
      }

      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure utterance
      utterance.rate = Math.max(0.1, Math.min(10, options.rate || 1.0));
      utterance.pitch = Math.max(0, Math.min(2, options.pitch || 1.0));
      utterance.volume = Math.max(0, Math.min(1, options.volume || 1.0));
      
      // Set voice
      if (this.selectedVoice && this.selectedVoice.voice) {
        utterance.voice = this.selectedVoice.voice;
      }

      utterance.onstart = () => {
        this.isPlaying = true;
        this.isPaused = false;
        this.log(`🔊 Started speaking: "${text.substring(0, 50)}..."`);
        this.onStatusChange?.({
          isPlaying: true,
          isPaused: false,
          provider: this.selectedProvider,
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
          provider: this.selectedProvider
        });
      };

      utterance.onerror = (event) => {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentUtterance = null;
        this.log(`❌ Speech error: ${event.error}`);
        
        // Try fallback provider on error
        this.tryFallbackProvider(text, options, reject);
      };

      this.currentUtterance = utterance;
      
      try {
        speechSynthesis.speak(utterance);
        this.log(`🎤 Speech queued successfully`);
      } catch (error) {
        this.log(`❌ Failed to start speech: ${error.message}`);
        this.tryFallbackProvider(text, options, reject);
      }
    });
  }

  async speakWithCloudTts(text, options = {}) {
    // For cloud TTS, we'll show a modal with options
    this.showCloudTtsModal(text);
    return Promise.resolve();
  }

  async tryFallbackProvider(text, options, reject) {
    this.log('🔄 Trying fallback provider...');
    
    // Try next available provider
    const providers = ['responsiveVoice', 'webSpeech', 'speechSynthesis', 'cloudTts'];
    const currentIndex = providers.indexOf(this.selectedProvider);
    
    for (let i = currentIndex + 1; i < providers.length; i++) {
      const provider = providers[i];
      if (this.providers[provider].available) {
        this.selectedProvider = provider;
        this.log(`🔄 Switching to fallback provider: ${provider}`);
        
        try {
          await this.speak(text, options);
          return;
        } catch (error) {
          this.log(`❌ Fallback provider ${provider} also failed`);
          continue;
        }
      }
    }
    
    // All providers failed
    reject(new Error('All TTS providers failed'));
  }

  async requireUserInteraction() {
    if (!this.userInteractionRequired) return true;
    
    return new Promise((resolve) => {
      this.showUserInteractionModal(resolve);
    });
  }

  showUserInteractionModal(callback) {
    const existingModals = document.querySelectorAll('[data-universal-tts-modal]');
    existingModals.forEach(modal => modal.remove());
    
    const modal = document.createElement('div');
    modal.setAttribute('data-universal-tts-modal', 'true');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); z-index: 10000; display: flex;
      align-items: center; justify-content: center; font-family: Arial, sans-serif;
    `;
    
    const providerInfo = this.getProviderInfo();
    
    modal.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h3 style="margin-top: 0; color: #007bff;">🔊 Enable Universal Text-to-Speech</h3>
        <p style="margin: 20px 0; line-height: 1.6;">
          Click the button below to enable text-to-speech for this PDF.
          This works on all devices without requiring downloads!
        </p>
        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: left;">
          <strong>🎯 Provider:</strong> ${providerInfo.name}<br>
          <strong>🎤 Voice:</strong> ${providerInfo.voice}<br>
          <strong>🌍 Language:</strong> ${providerInfo.language}<br>
          <strong>📱 Platform:</strong> ${providerInfo.platform}
        </div>
        <button id="enable-universal-tts-btn" style="background: #007bff; color: white; border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold;">
          🔊 Enable Audio Reading
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const enableBtn = modal.querySelector('#enable-universal-tts-btn');
    enableBtn.addEventListener('click', () => {
      this.userInteractionRequired = false;
      modal.remove();
      this.log('✅ User interaction completed, Universal TTS enabled');
      callback(true);
    });
  }

  getProviderInfo() {
    const platform = this.detectPlatform();
    
    switch (this.selectedProvider) {
      case 'responsiveVoice':
        return {
          name: 'ResponsiveVoice (Cloud)',
          voice: 'US English Female',
          language: 'English',
          platform: platform
        };
      case 'webSpeech':
        return {
          name: 'Web Speech API',
          voice: this.selectedVoice?.name || 'Browser Default',
          language: this.selectedVoice?.lang || 'Auto-detect',
          platform: platform
        };
      case 'speechSynthesis':
        return {
          name: 'Enhanced Speech Synthesis',
          voice: this.selectedVoice?.name || 'System Default',
          language: this.selectedVoice?.lang || 'Auto-detect',
          platform: platform
        };
      case 'cloudTts':
        return {
          name: 'Cloud TTS Service',
          voice: 'Online Service',
          language: 'Multiple',
          platform: platform
        };
      default:
        return {
          name: 'Unknown',
          voice: 'Unknown',
          language: 'Unknown',
          platform: platform
        };
    }
  }

  showCloudTtsModal(text) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); z-index: 10000; display: flex;
      align-items: center; justify-content: center; font-family: Arial, sans-serif;
    `;
    
    const services = this.providers.cloudTts.services;
    const serviceButtons = services.map(service =>
      `<button onclick="window.open('${service.url}', '_blank'); this.closest('[data-universal-tts-modal]').remove();" style="background: #28a745; color: white; border: none; padding: 12px 24px; margin: 8px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
        🔊 Open ${service.name}
      </button>`
    ).join('');
    
    // Truncate text if too long for display
    const displayText = text.length > 500 ? text.substring(0, 500) + '...' : text;
    
    modal.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 15px; max-width: 700px; max-height: 90vh; overflow-y: auto; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h3 style="margin-top: 0; color: #007bff; display: flex; align-items: center; justify-content: center; gap: 10px;">
          🌐 Online Text-to-Speech
        </h3>
        
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left;">
          <p style="margin: 0; color: #1976d2; font-weight: bold;">
            ℹ️ Your system doesn't have local text-to-speech voices installed.
          </p>
          <p style="margin: 10px 0 0 0; color: #1976d2;">
            Use one of these free online services to hear the text read aloud:
          </p>
        </div>
        
        <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: left;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <strong>Text to read:</strong>
            <button onclick="navigator.clipboard.writeText(this.getAttribute('data-text')); this.textContent='✅ Copied!'; setTimeout(() => this.textContent='📋 Copy Text', 2000);"
                    data-text="${text.replace(/"/g, '&quot;')}"
                    style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
              📋 Copy Text
            </button>
          </div>
          <div style="max-height: 150px; overflow-y: auto; padding: 10px; background: white; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 14px; line-height: 1.4;">
            ${displayText}
          </div>
        </div>
        
        <div style="margin: 25px 0;">
          <p style="margin-bottom: 15px; font-weight: bold; color: #333;">Choose a service:</p>
          <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">
            ${serviceButtons}
          </div>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: left;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>💡 How to use:</strong><br>
            1. Click "Copy Text" above<br>
            2. Click one of the service buttons<br>
            3. Paste the text into the website<br>
            4. Click the play button on the website
          </p>
        </div>
        
        <div style="margin-top: 25px; display: flex; gap: 10px; justify-content: center;">
          <button onclick="this.closest('[data-universal-tts-modal]').remove()"
                  style="background: #6c757d; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px;">
            ✕ Close
          </button>
          <button onclick="location.reload()"
                  style="background: #17a2b8; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px;">
            🔄 Retry TTS
          </button>
        </div>
      </div>
    `;
    
    modal.setAttribute('data-universal-tts-modal', 'true');
    document.body.appendChild(modal);
    
    // Auto-focus the copy button for better UX
    setTimeout(() => {
      const copyBtn = modal.querySelector('[data-text]');
      if (copyBtn) copyBtn.focus();
    }, 100);
  }

  showNoTtsAvailableError() {
    const guidance = {
      title: '❌ No Text-to-Speech Available',
      message: `
        <div style="text-align: left; line-height: 1.6;">
          <p><strong>No TTS providers could be initialized on your system.</strong></p>
          
          <h4>🔧 Quick Fixes</h4>
          <ul>
            <li><strong>Refresh the page:</strong> TTS services may load on refresh</li>
            <li><strong>Try a different browser:</strong> Chrome, Firefox, Safari, or Edge</li>
            <li><strong>Enable JavaScript:</strong> TTS requires JavaScript to function</li>
            <li><strong>Check internet connection:</strong> Cloud TTS needs internet access</li>
          </ul>
          
          <h4>🌐 Online Alternatives</h4>
          <ul>
            <li><a href="https://ttsreader.com" target="_blank">TTSReader.com</a> - Free online TTS</li>
            <li><a href="https://www.naturalreaders.com/online/" target="_blank">NaturalReaders</a> - High-quality voices</li>
            <li><a href="https://www.readspeaker.com/demo/" target="_blank">ReadSpeaker</a> - Professional TTS</li>
          </ul>
          
          <h4>📱 Mobile Users</h4>
          <ul>
            <li><strong>iOS:</strong> Use Safari browser for best TTS support</li>
            <li><strong>Android:</strong> Use Chrome browser</li>
          </ul>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <strong>💡 This system works without downloads!</strong><br>
            Universal TTS provides multiple fallback options to ensure speech works on your device.
          </div>
        </div>
      `
    };
    
    this.onError?.(guidance);
  }

  stop() {
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }
    
    if (window.responsiveVoice) {
      responsiveVoice.cancel();
    }
    
    this.isPlaying = false;
    this.isPaused = false;
    this.currentUtterance = null;
    this.log('⏹️ All TTS stopped');
  }

  pause() {
    if (this.selectedProvider === 'webSpeech' || this.selectedProvider === 'speechSynthesis') {
      if (window.speechSynthesis && speechSynthesis.speaking && !speechSynthesis.paused) {
        speechSynthesis.pause();
        this.isPaused = true;
        this.log('⏸️ Speech paused');
      }
    } else if (this.selectedProvider === 'responsiveVoice') {
      if (window.responsiveVoice && responsiveVoice.isPlaying()) {
        responsiveVoice.pause();
        this.isPaused = true;
        this.log('⏸️ ResponsiveVoice paused');
      }
    }
  }

  resume() {
    if (this.selectedProvider === 'webSpeech' || this.selectedProvider === 'speechSynthesis') {
      if (window.speechSynthesis && speechSynthesis.paused) {
        speechSynthesis.resume();
        this.isPaused = false;
        this.log('▶️ Speech resumed');
      }
    } else if (this.selectedProvider === 'responsiveVoice') {
      if (window.responsiveVoice) {
        responsiveVoice.resume();
        this.isPaused = false;
        this.log('▶️ ResponsiveVoice resumed');
      }
    }
  }

  getVoices() {
    switch (this.selectedProvider) {
      case 'responsiveVoice':
        return [
          { name: 'US English Female', lang: 'en-US' },
          { name: 'US English Male', lang: 'en-US' },
          { name: 'UK English Female', lang: 'en-GB' },
          { name: 'UK English Male', lang: 'en-GB' }
        ];
      case 'webSpeech':
        return this.providers.webSpeech.voices;
      case 'speechSynthesis':
        return this.providers.speechSynthesis.voices;
      case 'cloudTts':
        return this.providers.cloudTts.services.map(s => ({ name: s.name, lang: 'multiple' }));
      default:
        return [];
    }
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      selectedProvider: this.selectedProvider,
      selectedVoice: this.selectedVoice?.name || null,
      availableProviders: Object.keys(this.providers).filter(p => this.providers[p].available),
      userInteractionRequired: this.userInteractionRequired,
      platform: this.detectPlatform()
    };
  }

  destroy() {
    this.stop();
    
    // Remove any modals
    const modals = document.querySelectorAll('[data-universal-tts-modal]');
    modals.forEach(modal => modal.remove());
    
    this.isInitialized = false;
    this.log('🗑️ Universal TTS Manager destroyed');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UniversalTtsManager;
} else if (typeof window !== 'undefined') {
  window.UniversalTtsManager = UniversalTtsManager;
}