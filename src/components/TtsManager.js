/**
 * Progressive TTS Manager
 * Provides multiple TTS fallback options for maximum compatibility
 */

class TtsManager {
  constructor() {
    this.isInitialized = false;
    this.currentProvider = null;
    this.providers = [];
    this.currentUtterance = null;
    this.isPlaying = false;
    this.onStatusChange = null;
    this.onError = null;
    this.onSuccess = null;
  }

  async initialize() {
    console.log('🔊 Initializing TTS Manager...');
    
    // Register providers in order of preference
    this.registerProviders();
    
    // Test providers and find the best one
    for (const provider of this.providers) {
      try {
        const isAvailable = await provider.test();
        if (isAvailable) {
          this.currentProvider = provider;
          console.log(`✅ TTS Provider selected: ${provider.name}`);
          this.isInitialized = true;
          this.onSuccess?.(`Text-to-speech ready using ${provider.name}`);
          return true;
        }
      } catch (error) {
        console.warn(`❌ Provider ${provider.name} failed:`, error.message);
      }
    }
    
    // If no providers work, show helpful guidance
    this.showFallbackGuidance();
    return false;
  }

  registerProviders() {
    // Provider 1: Web Speech API (best compatibility)
    this.providers.push({
      name: 'Web Speech API',
      test: () => this.testWebSpeechAPI(),
      speak: (text, options) => this.speakWebSpeech(text, options),
      stop: () => this.stopWebSpeech(),
      pause: () => this.pauseWebSpeech(),
      resume: () => this.resumeWebSpeech(),
      getVoices: () => this.getWebSpeechVoices()
    });

    // Provider 2: ElevenLabs API (high quality, requires API key)
    this.providers.push({
      name: 'ElevenLabs TTS',
      test: () => this.testElevenLabs(),
      speak: (text, options) => this.speakElevenLabs(text, options),
      stop: () => this.stopElevenLabs(),
      pause: () => this.pauseElevenLabs(),
      resume: () => this.resumeElevenLabs(),
      getVoices: () => this.getElevenLabsVoices()
    });

    // Provider 3: Azure Cognitive Services (enterprise option)
    this.providers.push({
      name: 'Azure Speech',
      test: () => this.testAzureSpeech(),
      speak: (text, options) => this.speakAzureSpeech(text, options),
      stop: () => this.stopAzureSpeech(),
      pause: () => this.pauseAzureSpeech(),
      resume: () => this.resumeAzureSpeech(),
      getVoices: () => this.getAzureSpeechVoices()
    });

    // Provider 4: Browser Extension Detection
    this.providers.push({
      name: 'Browser Extension',
      test: () => this.testBrowserExtensions(),
      speak: (text, options) => this.speakBrowserExtension(text, options),
      stop: () => this.stopBrowserExtension(),
      pause: () => this.pauseBrowserExtension(),
      resume: () => this.resumeBrowserExtension(),
      getVoices: () => this.getBrowserExtensionVoices()
    });
  }

  // Web Speech API Implementation
  async testWebSpeechAPI() {
    if (!window.speechSynthesis) {
      throw new Error('Web Speech API not supported');
    }

    return new Promise((resolve) => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(true);
        return;
      }

      // Wait for voices to load
      const timeout = setTimeout(() => resolve(false), 3000);
      
      speechSynthesis.addEventListener('voiceschanged', () => {
        clearTimeout(timeout);
        resolve(speechSynthesis.getVoices().length > 0);
      }, { once: true });

      // Force voice loading
      const dummy = new SpeechSynthesisUtterance('');
      speechSynthesis.speak(dummy);
      speechSynthesis.cancel();
    });
  }

  speakWebSpeech(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Web Speech API not available'));
        return;
      }

      this.stopWebSpeech();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure utterance
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;
      
      if (options.voice) {
        const voices = speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.name === options.voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onstart = () => {
        this.isPlaying = true;
        this.onStatusChange?.({ isPlaying: true, provider: 'Web Speech API' });
        resolve();
      };

      utterance.onend = () => {
        this.isPlaying = false;
        this.currentUtterance = null;
        this.onStatusChange?.({ isPlaying: false, provider: 'Web Speech API' });
      };

      utterance.onerror = (event) => {
        this.isPlaying = false;
        this.currentUtterance = null;
        this.onError?.(`Speech error: ${event.error}`);
        reject(new Error(event.error));
      };

      this.currentUtterance = utterance;
      speechSynthesis.speak(utterance);
    });
  }

  stopWebSpeech() {
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
      this.isPlaying = false;
      this.currentUtterance = null;
    }
  }

  pauseWebSpeech() {
    if (window.speechSynthesis && speechSynthesis.speaking) {
      speechSynthesis.pause();
    }
  }

  resumeWebSpeech() {
    if (window.speechSynthesis && speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  }

  getWebSpeechVoices() {
    if (!window.speechSynthesis) return [];
    return speechSynthesis.getVoices().map(voice => ({
      name: voice.name,
      lang: voice.lang,
      gender: voice.name.toLowerCase().includes('female') ? 'female' : 'male'
    }));
  }

  // ElevenLabs Implementation (requires API key)
  async testElevenLabs() {
    // Check if API key is available (could be in env vars or config)
    const apiKey = this.getElevenLabsApiKey();
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey }
      });
      return response.ok;
    } catch (error) {
      throw new Error('ElevenLabs API not accessible');
    }
  }

  async speakElevenLabs(text, options = {}) {
    const apiKey = this.getElevenLabsApiKey();
    const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default voice

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            speed: options.rate || 1.0
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onplay = () => {
        this.isPlaying = true;
        this.onStatusChange?.({ isPlaying: true, provider: 'ElevenLabs' });
      };

      audio.onended = () => {
        this.isPlaying = false;
        URL.revokeObjectURL(audioUrl);
        this.onStatusChange?.({ isPlaying: false, provider: 'ElevenLabs' });
      };

      audio.onerror = () => {
        this.isPlaying = false;
        URL.revokeObjectURL(audioUrl);
        this.onError?.('Audio playback failed');
      };

      this.currentUtterance = audio;
      await audio.play();
      
    } catch (error) {
      throw new Error(`ElevenLabs TTS failed: ${error.message}`);
    }
  }

  stopElevenLabs() {
    if (this.currentUtterance && this.currentUtterance.pause) {
      this.currentUtterance.pause();
      this.currentUtterance.currentTime = 0;
      this.isPlaying = false;
    }
  }

  pauseElevenLabs() {
    if (this.currentUtterance && this.currentUtterance.pause) {
      this.currentUtterance.pause();
    }
  }

  resumeElevenLabs() {
    if (this.currentUtterance && this.currentUtterance.play) {
      this.currentUtterance.play();
    }
  }

  getElevenLabsApiKey() {
    // Check multiple sources for API key
    return process.env.ELEVENLABS_API_KEY || 
           localStorage.getItem('elevenlabs_api_key') ||
           null;
  }

  getElevenLabsVoices() {
    // Return default voices - could be enhanced to fetch from API
    return [
      { name: 'Rachel', lang: 'en-US', gender: 'female' },
      { name: 'Drew', lang: 'en-US', gender: 'male' },
      { name: 'Clyde', lang: 'en-US', gender: 'male' },
      { name: 'Paul', lang: 'en-US', gender: 'male' }
    ];
  }

  // Azure Speech Implementation (placeholder)
  async testAzureSpeech() {
    // Similar implementation for Azure
    throw new Error('Azure Speech not configured');
  }

  // Browser Extension Detection
  async testBrowserExtensions() {
    // Check for common TTS extensions
    const extensions = [
      'speechSynthesisExtension',
      'readAloudExtension',
      'naturalReaderExtension'
    ];

    for (const ext of extensions) {
      if (window[ext]) {
        return true;
      }
    }
    
    throw new Error('No TTS browser extensions detected');
  }

  // Fallback guidance for users
  showFallbackGuidance() {
    const guidance = {
      title: '🔊 Text-to-Speech Setup Required',
      message: `
        <div style="text-align: left; line-height: 1.6;">
          <p><strong>No text-to-speech voices are available.</strong> Here are your options:</p>
          
          <h4>🌐 Browser Extensions (Recommended)</h4>
          <ul>
            <li><strong>Chrome:</strong> Install "Read Aloud" or "SpeakIt!" extension</li>
            <li><strong>Firefox:</strong> Install "FoxVox" or "Read Aloud" extension</li>
            <li><strong>Edge:</strong> Install "Immersive Reader" or "Read Aloud" extension</li>
          </ul>
          
          <h4>🖥️ System Setup</h4>
          <ul>
            <li><strong>Windows:</strong> Enable "Narrator" in Accessibility settings</li>
            <li><strong>macOS:</strong> Enable "VoiceOver" in System Preferences</li>
            <li><strong>Linux:</strong> Install espeak: <code>sudo apt install espeak</code></li>
          </ul>
          
          <h4>☁️ Online Services</h4>
          <ul>
            <li>Copy text and use <a href="https://www.naturalreaders.com" target="_blank">NaturalReader</a></li>
            <li>Use <a href="https://ttsreader.com" target="_blank">TTSReader</a> online</li>
            <li>Try <a href="https://www.speechify.com" target="_blank">Speechify</a> web app</li>
          </ul>
          
          <p><em>After setup, refresh this page to try again.</em></p>
        </div>
      `,
      actions: [
        {
          text: '🔄 Retry TTS Setup',
          action: () => this.initialize()
        },
        {
          text: '📋 Copy Text Instead',
          action: () => this.enableCopyMode()
        }
      ]
    };

    this.onError?.(guidance);
  }

  enableCopyMode() {
    // Enable text selection and copy functionality as fallback
    this.onSuccess?.('Copy mode enabled - select text to copy to clipboard');
  }

  // Public API methods
  async speak(text, options = {}) {
    if (!this.isInitialized || !this.currentProvider) {
      throw new Error('TTS not initialized');
    }
    
    return this.currentProvider.speak(text, options);
  }

  stop() {
    if (this.currentProvider) {
      this.currentProvider.stop();
    }
  }

  pause() {
    if (this.currentProvider) {
      this.currentProvider.pause();
    }
  }

  resume() {
    if (this.currentProvider) {
      this.currentProvider.resume();
    }
  }

  getVoices() {
    if (this.currentProvider) {
      return this.currentProvider.getVoices();
    }
    return [];
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isPlaying: this.isPlaying,
      currentProvider: this.currentProvider?.name || null,
      availableProviders: this.providers.map(p => p.name)
    };
  }
}

// Export for use in Astro component
window.TtsManager = TtsManager;