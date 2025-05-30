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
    this.onError = null;
    this.onSuccess = null;
    this.debugMode = localStorage.getItem('tts_debug') === 'true';
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
    this.showCloudTtsGuidance();
    return false;
  }

  registerProviders() {
    // Provider 1: Free TTS API (works without API keys)
    this.providers.push({
      name: 'Free Cloud TTS',
      test: () => this.testFreeTTS(),
      speak: (text, options) => this.speakFreeTTS(text, options),
      stop: () => this.stopAudio(),
      pause: () => this.pauseAudio(),
      resume: () => this.resumeAudio(),
      getVoices: () => this.getFreeTTSVoices()
    });

    // Provider 2: Text-to-Speech API (alternative free service)
    this.providers.push({
      name: 'Alternative Cloud TTS',
      test: () => this.testAlternativeTTS(),
      speak: (text, options) => this.speakAlternativeTTS(text, options),
      stop: () => this.stopAudio(),
      pause: () => this.pauseAudio(),
      resume: () => this.resumeAudio(),
      getVoices: () => this.getAlternativeTTSVoices()
    });

    // Provider 3: Browser Speech Synthesis (fallback)
    this.providers.push({
      name: 'Browser TTS (if available)',
      test: () => this.testBrowserTTS(),
      speak: (text, options) => this.speakBrowserTTS(text, options),
      stop: () => this.stopBrowserTTS(),
      pause: () => this.pauseBrowserTTS(),
      resume: () => this.resumeBrowserTTS(),
      getVoices: () => this.getBrowserTTSVoices()
    });

    // Provider 4: Copy Helper (always works)
    this.providers.push({
      name: 'Copy to External Service',
      test: () => this.testCopyHelper(),
      speak: (text, options) => this.speakCopyHelper(text, options),
      stop: () => this.stopCopyHelper(),
      pause: () => this.pauseCopyHelper(),
      resume: () => this.resumeCopyHelper(),
      getVoices: () => this.getCopyHelperVoices()
    });
  }

  // Free TTS API Implementation
  async testFreeTTS() {
    try {
      // Test with a simple request to a free TTS service
      const testUrl = 'https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=test';
      const response = await fetch(testUrl, { method: 'HEAD' });
      return true; // If we can reach it, assume it works
    } catch (error) {
      throw new Error('Free TTS API not accessible');
    }
  }

  async speakFreeTTS(text, options = {}) {
    try {
      // Use StreamElements free TTS API (no API key required)
      const voice = options.voice || 'Brian'; // Default voice
      const rate = options.rate || 1.0; // Speed control
      const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodeURIComponent(text)}`;
      
      this.log(`🔊 Generating speech with Free TTS API... (rate: ${rate}x)`);
      
      // Create audio element
      const audio = new Audio(url);
      
      audio.onloadstart = () => {
        this.log('📡 Loading audio from cloud...');
      };

      audio.oncanplay = () => {
        this.log('✅ Audio ready to play');
        // Apply speed control using HTML5 Audio playbackRate
        audio.playbackRate = rate;
        this.log(`🎛️ Playback rate set to ${rate}x`);
      };

      audio.onplay = () => {
        this.isPlaying = true;
        this.onStatusChange?.({ isPlaying: true, provider: 'Free Cloud TTS' });
        this.log(`🔊 Audio playing at ${rate}x speed`);
      };

      audio.onended = () => {
        this.isPlaying = false;
        this.currentAudio = null;
        this.onStatusChange?.({ isPlaying: false, provider: 'Free Cloud TTS' });
        this.log('✅ Audio finished');
      };

      audio.onerror = (e) => {
        this.isPlaying = false;
        this.currentAudio = null;
        this.log('❌ Audio error:', e);
        throw new Error('Audio playback failed');
      };

      this.currentAudio = audio;
      await audio.play();
      
    } catch (error) {
      throw new Error(`Free Cloud TTS failed: ${error.message}`);
    }
  }

  // Alternative TTS API Implementation
  async testAlternativeTTS() {
    try {
      // Test another free TTS service
      const response = await fetch('https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=test', {
        method: 'HEAD'
      });
      return true;
    } catch (error) {
      throw new Error('Alternative TTS API not accessible');
    }
  }

  async speakAlternativeTTS(text, options = {}) {
    try {
      // Use Google Translate TTS (free, no API key)
      const lang = options.lang || 'en';
      const rate = options.rate || 1.0; // Speed control
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`;
      
      this.log(`🔊 Generating speech with Google TTS... (rate: ${rate}x)`);
      
      const audio = new Audio(url);
      
      audio.oncanplay = () => {
        // Apply speed control using HTML5 Audio playbackRate
        audio.playbackRate = rate;
        this.log(`🎛️ Playback rate set to ${rate}x`);
      };
      
      audio.onplay = () => {
        this.isPlaying = true;
        this.onStatusChange?.({ isPlaying: true, provider: 'Alternative Cloud TTS' });
        this.log(`🔊 Audio playing at ${rate}x speed`);
      };

      audio.onended = () => {
        this.isPlaying = false;
        this.currentAudio = null;
        this.onStatusChange?.({ isPlaying: false, provider: 'Alternative Cloud TTS' });
      };

      audio.onerror = () => {
        this.isPlaying = false;
        this.currentAudio = null;
        throw new Error('Google TTS playback failed');
      };

      this.currentAudio = audio;
      await audio.play();
      
    } catch (error) {
      throw new Error(`Alternative Cloud TTS failed: ${error.message}`);
    }
  }

  // Browser TTS (fallback)
  async testBrowserTTS() {
    if (!window.speechSynthesis) {
      throw new Error('Browser TTS not supported');
    }
    
    // Wait for voices to load
    return new Promise((resolve) => {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => resolve(false), 2000);
      
      speechSynthesis.addEventListener('voiceschanged', () => {
        clearTimeout(timeout);
        resolve(speechSynthesis.getVoices().length > 0);
      }, { once: true });
    });
  }

  async speakBrowserTTS(text, options = {}) {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;

      utterance.onstart = () => {
        this.isPlaying = true;
        this.onStatusChange?.({ isPlaying: true, provider: 'Browser TTS' });
        resolve();
      };

      utterance.onend = () => {
        this.isPlaying = false;
        this.onStatusChange?.({ isPlaying: false, provider: 'Browser TTS' });
      };

      utterance.onerror = (event) => {
        this.isPlaying = false;
        reject(new Error(event.error));
      };

      speechSynthesis.speak(utterance);
    });
  }

  // Copy Helper Implementation
  async testCopyHelper() {
    return true; // Always works
  }

  async speakCopyHelper(text, options = {}) {
    try {
      // Copy text to clipboard
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      this.showCopyHelperModal(text);
      
    } catch (error) {
      throw new Error(`Copy failed: ${error.message}`);
    }
  }

  // Audio control methods
  stopAudio() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.isPlaying = false;
      this.currentAudio = null;
    }
  }

  pauseAudio() {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
    }
  }

  resumeAudio() {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play();
    }
  }

  stopBrowserTTS() {
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
      this.isPlaying = false;
    }
  }

  pauseBrowserTTS() {
    if (window.speechSynthesis && speechSynthesis.speaking) {
      speechSynthesis.pause();
    }
  }

  resumeBrowserTTS() {
    if (window.speechSynthesis && speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  }

  stopCopyHelper() {
    // Nothing to stop
  }

  pauseCopyHelper() {
    // Nothing to pause
  }

  resumeCopyHelper() {
    // Nothing to resume
  }

  // Voice lists
  getFreeTTSVoices() {
    return [
      { name: 'Brian', lang: 'en-US', gender: 'male' },
      { name: 'Amy', lang: 'en-GB', gender: 'female' },
      { name: 'Emma', lang: 'en-US', gender: 'female' },
      { name: 'Russell', lang: 'en-AU', gender: 'male' }
    ];
  }

  getAlternativeTTSVoices() {
    return [
      { name: 'Google English', lang: 'en', gender: 'neutral' },
      { name: 'Google Spanish', lang: 'es', gender: 'neutral' },
      { name: 'Google French', lang: 'fr', gender: 'neutral' }
    ];
  }

  getBrowserTTSVoices() {
    if (!window.speechSynthesis) return [];
    return speechSynthesis.getVoices().map(voice => ({
      name: voice.name,
      lang: voice.lang,
      gender: voice.name.toLowerCase().includes('female') ? 'female' : 'male'
    }));
  }

  getCopyHelperVoices() {
    return [
      { name: 'Copy to External Service', lang: 'en-US', gender: 'neutral' }
    ];
  }

  // Modal for copy helper
  showCopyHelperModal(text) {
    // Remove any existing modals
    const existingModals = document.querySelectorAll('[data-cloud-tts-modal]');
    existingModals.forEach(modal => modal.remove());
    
    const modal = document.createElement('div');
    modal.setAttribute('data-cloud-tts-modal', 'true');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); z-index: 10000; display: flex;
      align-items: center; justify-content: center; font-family: Arial, sans-serif;
    `;
    
    modal.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h3 style="margin-top: 0; color: #007bff;">📋 Text Copied!</h3>
        <p style="margin: 20px 0;">Cloud TTS services are temporarily unavailable. Your text has been copied to the clipboard.</p>
        
        <div style="text-align: left; margin: 20px 0; background: #f8f9fa; padding: 15px; border-radius: 8px;">
          <strong>🌐 Use these online services:</strong><br>
          • <a href="https://ttsreader.com" target="_blank" style="color: #007bff;">TTSReader.com</a> - Paste and play<br>
          • <a href="https://www.naturalreaders.com/online/" target="_blank" style="color: #007bff;">NaturalReader</a> - High quality<br>
          • <a href="https://speechify.com" target="_blank" style="color: #007bff;">Speechify</a> - Premium voices
        </div>
        
        <button onclick="this.closest('[data-cloud-tts-modal]').remove();" 
                style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">
          ✓ Got it!
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (modal.parentNode) {
        modal.remove();
      }
    }, 30000);
  }

  showCloudTtsGuidance() {
    const guidance = {
      title: '🌐 Cloud TTS Setup',
      message: `
        <div style="text-align: left; line-height: 1.6;">
          <p><strong>Cloud TTS services are currently unavailable.</strong></p>
          <p>This can happen due to network restrictions or service limitations.</p>
          
          <h4>🚀 Immediate Solutions:</h4>
          <ul>
            <li><strong>Online Services:</strong> Use TTSReader.com or NaturalReader</li>
            <li><strong>Browser Extension:</strong> Install "Read Aloud" extension</li>
            <li><strong>Copy Mode:</strong> Copy text and paste into external TTS service</li>
          </ul>
          
          <h4>🔧 For Website Owners:</h4>
          <ul>
            <li>Consider using paid TTS APIs (ElevenLabs, Azure, Google Cloud)</li>
            <li>Implement server-side TTS generation</li>
            <li>Provide audio files for important content</li>
          </ul>
        </div>
      `
    };

    this.onError?.(guidance);
  }

  // Public API methods
  async speak(text, options = {}) {
    if (!this.isInitialized || !this.currentProvider) {
      throw new Error('Cloud TTS not initialized');
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

  // Update playback rate of currently playing audio
  setPlaybackRate(rate) {
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.playbackRate = rate;
      this.log(`🎛️ Playback rate updated to ${rate}x during playback`);
      return true;
    }
    return false;
  }
}

// Export for use in Astro component
window.CloudTtsManager = CloudTtsManager;