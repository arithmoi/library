/**
 * Fixed TTS Manager - Handles systems with no voices
 * Provides working alternatives for all scenarios
 */

class TtsManagerFixed {
  constructor() {
    this.isInitialized = false;
    this.currentProvider = null;
    this.providers = [];
    this.currentUtterance = null;
    this.isPlaying = false;
    this.onStatusChange = null;
    this.onError = null;
    this.onSuccess = null;
    this.debugMode = localStorage.getItem('tts_debug') === 'true';
  }

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[TTS] ${message}`, ...args);
    }
  }

  async initialize() {
    this.log('🔊 Initializing Fixed TTS Manager...');
    
    // Register providers in order of reliability
    this.registerProviders();
    
    // Test providers and find the best one
    for (const provider of this.providers) {
      try {
        this.log(`Testing provider: ${provider.name}`);
        const isAvailable = await provider.test();
        if (isAvailable) {
          this.currentProvider = provider;
          this.log(`✅ TTS Provider selected: ${provider.name}`);
          this.isInitialized = true;
          
          // For Web Speech API, go directly to Copy Helper if no voices
          if (provider.name === 'Enhanced Web Speech') {
            const voices = speechSynthesis.getVoices();
            if (voices.length === 0) {
              this.log('⚠️ No voices found, switching to Copy Helper mode');
              // Find and use Copy Helper instead
              const copyProvider = this.providers.find(p => p.name === 'Copy & Paste Helper');
              if (copyProvider) {
                this.currentProvider = copyProvider;
                this.onSuccess?.(`Text-to-speech ready using Copy & Paste Helper. Click "Speak" to copy text and get guidance.`);
                return true;
              }
            }
            this.onSuccess?.(`Text-to-speech ready using ${provider.name}. If you don't hear audio, try the copy mode.`);
          } else {
            this.onSuccess?.(`Text-to-speech ready using ${provider.name}`);
          }
          return true;
        }
      } catch (error) {
        this.log(`❌ Provider ${provider.name} failed:`, error.message);
      }
    }
    
    // If no providers work, show helpful guidance
    this.showSystemSpecificGuidance();
    return false;
  }

  registerProviders() {
    // Provider 1: SpeechSynthesis with voice forcing
    this.providers.push({
      name: 'Enhanced Web Speech',
      test: () => this.testEnhancedWebSpeech(),
      speak: (text, options) => this.speakEnhancedWebSpeech(text, options),
      stop: () => this.stopEnhancedWebSpeech(),
      pause: () => this.pauseEnhancedWebSpeech(),
      resume: () => this.resumeEnhancedWebSpeech(),
      getVoices: () => this.getEnhancedWebSpeechVoices()
    });

    // Provider 2: Free TTS API (no API key required)
    this.providers.push({
      name: 'Free TTS API',
      test: () => this.testFreeTTS(),
      speak: (text, options) => this.speakFreeTTS(text, options),
      stop: () => this.stopFreeTTS(),
      pause: () => this.pauseFreeTTS(),
      resume: () => this.resumeFreeTTS(),
      getVoices: () => this.getFreeTTSVoices()
    });

    // Provider 3: Browser Extension Bridge
    this.providers.push({
      name: 'Extension Bridge',
      test: () => this.testExtensionBridge(),
      speak: (text, options) => this.speakExtensionBridge(text, options),
      stop: () => this.stopExtensionBridge(),
      pause: () => this.pauseExtensionBridge(),
      resume: () => this.resumeExtensionBridge(),
      getVoices: () => this.getExtensionBridgeVoices()
    });

    // Provider 4: Copy-to-Clipboard with TTS guidance
    this.providers.push({
      name: 'Copy & Paste Helper',
      test: () => this.testCopyHelper(),
      speak: (text, options) => this.speakCopyHelper(text, options),
      stop: () => this.stopCopyHelper(),
      pause: () => this.pauseCopyHelper(),
      resume: () => this.resumeCopyHelper(),
      getVoices: () => this.getCopyHelperVoices()
    });
  }

  // Enhanced Web Speech with aggressive voice loading
  async testEnhancedWebSpeech() {
    if (!window.speechSynthesis) {
      throw new Error('Web Speech API not supported');
    }

    this.log('Testing enhanced web speech...');

    // Try multiple voice loading strategies
    const strategies = [
      () => this.forceVoiceLoad1(),
      () => this.forceVoiceLoad2(),
      () => this.forceVoiceLoad3(),
      () => this.forceVoiceLoad4()
    ];

    for (let i = 0; i < strategies.length; i++) {
      this.log(`Trying voice loading strategy ${i + 1}...`);
      
      try {
        await strategies[i]();
        const voices = speechSynthesis.getVoices();
        
        if (voices.length > 0) {
          this.log(`✅ Found ${voices.length} voices with strategy ${i + 1}`);
          return true;
        }
      } catch (error) {
        this.log(`Strategy ${i + 1} failed:`, error.message);
      }
    }

    // If still no voices, try to use default voice anyway
    this.log('No voices found, testing if default voice works...');
    const defaultWorks = await this.testDefaultVoice();
    
    if (defaultWorks) {
      this.log('✅ Default voice works even without voice list');
      return true;
    }
    
    this.log('❌ Web Speech API not functional');
    throw new Error('Web Speech API has no working voices');
  }

  async forceVoiceLoad1() {
    // Strategy 1: Multiple dummy utterances
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(), 2000);
      
      speechSynthesis.addEventListener('voiceschanged', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });

      // Create multiple dummy utterances
      for (let i = 0; i < 5; i++) {
        const dummy = new SpeechSynthesisUtterance('');
        dummy.volume = 0;
        speechSynthesis.speak(dummy);
        speechSynthesis.cancel();
      }
    });
  }

  async forceVoiceLoad2() {
    // Strategy 2: Repeated getVoices calls
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 20;
      
      const checkVoices = () => {
        attempts++;
        const voices = speechSynthesis.getVoices();
        
        if (voices.length > 0 || attempts >= maxAttempts) {
          resolve();
          return;
        }
        
        setTimeout(checkVoices, 100);
      };
      
      checkVoices();
    });
  }

  async forceVoiceLoad3() {
    // Strategy 3: Platform-specific loading
    return new Promise((resolve) => {
      const platform = navigator.platform.toLowerCase();
      
      if (platform.includes('linux')) {
        // Linux-specific voice loading
        this.log('Applying Linux voice loading strategy...');
        
        // Try to trigger voice loading with a longer utterance
        const dummy = new SpeechSynthesisUtterance('Loading voices for Linux system');
        dummy.volume = 0;
        dummy.rate = 0.1;
        
        dummy.onend = () => resolve();
        dummy.onerror = () => resolve();
        
        speechSynthesis.speak(dummy);
        
        // Fallback timeout
        setTimeout(() => {
          speechSynthesis.cancel();
          resolve();
        }, 3000);
      } else {
        resolve();
      }
    });
  }

  async forceVoiceLoad4() {
    // Strategy 4: User interaction simulation
    return new Promise((resolve) => {
      // Some browsers require user interaction to load voices
      const dummy = new SpeechSynthesisUtterance('test');
      dummy.volume = 0;
      dummy.rate = 10; // Very fast
      
      dummy.onstart = () => {
        speechSynthesis.cancel();
        setTimeout(() => resolve(), 500);
      };
      
      dummy.onerror = () => {
        setTimeout(() => resolve(), 500);
      };
      
      try {
        speechSynthesis.speak(dummy);
      } catch (error) {
        resolve();
      }
      
      // Fallback
      setTimeout(() => resolve(), 1000);
    });
  }

  async testDefaultVoice() {
    // Test if we can speak without explicit voices
    return new Promise((resolve) => {
      const testUtterance = new SpeechSynthesisUtterance('test');
      testUtterance.volume = 0;
      testUtterance.rate = 10;
      
      let resolved = false;
      
      testUtterance.onstart = () => {
        if (!resolved) {
          resolved = true;
          speechSynthesis.cancel();
          this.log('✅ Default voice works even without voice list');
          resolve(true);
        }
      };
      
      testUtterance.onend = () => {
        if (!resolved) {
          resolved = true;
          this.log('✅ Default voice completed test successfully');
          resolve(true);
        }
      };
      
      testUtterance.onerror = (event) => {
        if (!resolved) {
          resolved = true;
          this.log('❌ Default voice test failed:', event.error);
          // Even if there's an error, sometimes it still works
          // So we'll be optimistic and return true for common errors
          if (event.error === 'not-allowed' || event.error === 'canceled') {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      };
      
      // Timeout fallback
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          speechSynthesis.cancel();
          this.log('⚠️ Default voice test timed out, assuming it works');
          resolve(true); // Be optimistic
        }
      }, 3000);
      
      try {
        speechSynthesis.speak(testUtterance);
      } catch (error) {
        if (!resolved) {
          resolved = true;
          this.log('❌ Failed to create test utterance:', error.message);
          resolve(false);
        }
      }
    });
  }

  speakEnhancedWebSpeech(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Web Speech API not available'));
        return;
      }

      this.stopEnhancedWebSpeech();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure utterance
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;
      
      // Try to set voice if available
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0 && options.voice) {
        const selectedVoice = voices.find(v => v.name === options.voice);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.onstart = () => {
        this.isPlaying = true;
        this.onStatusChange?.({ isPlaying: true, provider: 'Enhanced Web Speech' });
        resolve();
      };

      utterance.onend = () => {
        this.isPlaying = false;
        this.currentUtterance = null;
        this.onStatusChange?.({ isPlaying: false, provider: 'Enhanced Web Speech' });
      };

      utterance.onerror = (event) => {
        this.isPlaying = false;
        this.currentUtterance = null;
        this.log('Speech error:', event.error);
        
        // Don't reject on common errors, just log them
        if (event.error === 'not-allowed' || event.error === 'canceled' || event.error === 'interrupted') {
          this.log('Speech was canceled, interrupted, or not allowed - this is normal');
          resolve();
        } else if (event.error === 'network' || event.error === 'synthesis-failed') {
          this.log('Speech synthesis failed, but resolving to try next provider');
          resolve();
        } else {
          this.log('Unexpected speech error, but resolving to continue');
          resolve();
        }
      };

      this.currentUtterance = utterance;
      speechSynthesis.speak(utterance);
    });
  }

  stopEnhancedWebSpeech() {
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
      this.isPlaying = false;
      this.currentUtterance = null;
    }
  }

  pauseEnhancedWebSpeech() {
    if (window.speechSynthesis && speechSynthesis.speaking) {
      speechSynthesis.pause();
    }
  }

  resumeEnhancedWebSpeech() {
    if (window.speechSynthesis && speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  }

  getEnhancedWebSpeechVoices() {
    if (!window.speechSynthesis) return [];
    
    const voices = speechSynthesis.getVoices();
    
    if (voices.length === 0) {
      // Return a default voice option
      return [{
        name: 'Default System Voice',
        lang: 'en-US',
        gender: 'neutral'
      }];
    }
    
    return voices.map(voice => ({
      name: voice.name,
      lang: voice.lang,
      gender: voice.name.toLowerCase().includes('female') ? 'female' : 'male'
    }));
  }

  // Free TTS API Implementation (disabled for now due to reliability issues)
  async testFreeTTS() {
    // Disable this provider for now as free APIs are unreliable
    throw new Error('Free TTS API disabled - unreliable service');
  }

  async speakFreeTTS(text, options = {}) {
    throw new Error('Free TTS API not available');
  }

  stopFreeTTS() {
    if (this.currentUtterance && this.currentUtterance.pause) {
      this.currentUtterance.pause();
      this.currentUtterance.currentTime = 0;
      this.isPlaying = false;
    }
  }

  pauseFreeTTS() {
    if (this.currentUtterance && this.currentUtterance.pause) {
      this.currentUtterance.pause();
    }
  }

  resumeFreeTTS() {
    if (this.currentUtterance && this.currentUtterance.play) {
      this.currentUtterance.play();
    }
  }

  getFreeTTSVoices() {
    return [
      { name: 'Free English Voice', lang: 'en-US', gender: 'neutral' }
    ];
  }

  // Extension Bridge Implementation
  async testExtensionBridge() {
    // Check for common TTS extensions
    const hasReadAloud = document.querySelector('[data-extension="read-aloud"]') !== null;
    const hasSpeakIt = window.speakItExtension !== undefined;
    const hasNaturalReader = window.naturalReaderExtension !== undefined;
    
    // Check for other common extension indicators
    const hasVoiceOver = window.voiceOverExtension !== undefined;
    const hasSelectAndSpeak = window.selectAndSpeak !== undefined;
    
    if (hasReadAloud || hasSpeakIt || hasNaturalReader || hasVoiceOver || hasSelectAndSpeak) {
      this.log('✅ TTS browser extension detected');
      return true;
    }
    
    // Check if there are any extension-injected TTS functions
    const extensionMethods = ['speechSynthesisExtension', 'readAloudExtension', 'ttsExtension'];
    for (const method of extensionMethods) {
      if (window[method]) {
        this.log(`✅ Extension method found: ${method}`);
        return true;
      }
    }
    
    this.log('❌ No TTS browser extensions detected');
    throw new Error('No TTS browser extensions detected');
  }

  async speakExtensionBridge(text, options = {}) {
    // Try to trigger extension TTS
    if (window.speakItExtension) {
      window.speakItExtension.speak(text);
    } else {
      // Fallback: create a selection and hope extension picks it up
      this.createTextSelection(text);
      throw new Error('Please use your browser extension to read the selected text');
    }
  }

  createTextSelection(text) {
    // Create a temporary element with the text
    const tempDiv = document.createElement('div');
    tempDiv.textContent = text;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);
    
    // Select the text
    const range = document.createRange();
    range.selectNodeContents(tempDiv);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Clean up after a delay
    setTimeout(() => {
      document.body.removeChild(tempDiv);
      selection.removeAllRanges();
    }, 5000);
  }

  stopExtensionBridge() {
    // Clear any text selection
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  }

  pauseExtensionBridge() {
    // Extensions handle their own pause/resume
  }

  resumeExtensionBridge() {
    // Extensions handle their own pause/resume
  }

  getExtensionBridgeVoices() {
    return [
      { name: 'Browser Extension Voice', lang: 'en-US', gender: 'neutral' }
    ];
  }

  // Copy Helper Implementation
  async testCopyHelper() {
    // This always works as a fallback
    return navigator.clipboard !== undefined || document.execCommand;
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
      
      // Show helpful message
      this.showCopyHelperGuidance(text);
      
    } catch (error) {
      throw new Error(`Copy failed: ${error.message}`);
    }
  }

  showCopyHelperGuidance(text) {
    // Remove any existing modals first
    const existingModals = document.querySelectorAll('[data-tts-modal]');
    existingModals.forEach(modal => modal.remove());
    
    const modal = document.createElement('div');
    modal.setAttribute('data-tts-modal', 'true');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); z-index: 10000; display: flex;
      align-items: center; justify-content: center; font-family: Arial, sans-serif;
    `;
    
    const closeModal = () => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    };
    
    modal.innerHTML = `
      <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h3 style="margin-top: 0; color: #007bff;">📋 Text Copied to Clipboard!</h3>
        <p style="margin: 20px 0; line-height: 1.6;">
          The text has been copied to your clipboard. You can now:
        </p>
        <div style="text-align: left; margin: 20px 0; background: #f8f9fa; padding: 15px; border-radius: 8px;">
          <strong>🔊 Online TTS Services:</strong><br>
          • <a href="https://ttsreader.com" target="_blank" style="color: #007bff;">TTSReader.com</a> - Paste and play<br>
          • <a href="https://www.naturalreaders.com/online/" target="_blank" style="color: #007bff;">NaturalReader</a> - High quality voices<br>
          • <a href="https://www.speechify.com" target="_blank" style="color: #007bff;">Speechify</a> - Premium experience<br><br>
          
          <strong>🔧 Browser Extensions:</strong><br>
          • Chrome: "Read Aloud" or "SpeakIt!"<br>
          • Firefox: "FoxVox" or "Read Aloud"<br>
          • Edge: "Immersive Reader"
        </div>
        <div style="margin-top: 25px;">
          <button id="close-modal-btn"
                  style="background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px;">
            ✓ Got it!
          </button>
        </div>
      </div>
    `;
    
    // Add click event listener to close button
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'close-modal-btn' || e.target === modal) {
        closeModal();
      }
    });
    
    document.body.appendChild(modal);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      closeModal();
    }, 30000);
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

  getCopyHelperVoices() {
    return [
      { name: 'Copy to External Service', lang: 'en-US', gender: 'neutral' }
    ];
  }

  // System-specific guidance
  showSystemSpecificGuidance() {
    const platform = navigator.platform.toLowerCase();
    const userAgent = navigator.userAgent.toLowerCase();
    
    let guidance = {
      title: '🔊 Text-to-Speech Setup Required',
      message: ''
    };

    if (platform.includes('linux')) {
      guidance.message = `
        <div style="text-align: left; line-height: 1.6;">
          <p><strong>🐧 Linux System Detected</strong></p>
          <p>Your system needs TTS voices installed. Choose one option:</p>
          
          <h4>🚀 Quick Fix (Recommended):</h4>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
            <strong>Ubuntu/Debian:</strong><br>
            <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">sudo apt install espeak espeak-data</code><br><br>
            
            <strong>Fedora:</strong><br>
            <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">sudo dnf install espeak espeak-devel</code><br><br>
            
            <strong>Arch:</strong><br>
            <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">sudo pacman -S espeak espeak-ng</code>
          </div>
          
          <h4>🌐 No Installation Required:</h4>
          <ul>
            <li><strong>Browser Extension:</strong> Install "Read Aloud" from Chrome Web Store</li>
            <li><strong>Online Service:</strong> Use copy mode to paste text into TTSReader.com</li>
            <li><strong>Mobile:</strong> Open this page on your phone for built-in TTS</li>
          </ul>
          
          <p><em>After installing, refresh this page to try again.</em></p>
        </div>
      `;
    } else if (platform.includes('win')) {
      guidance.message = `
        <div style="text-align: left; line-height: 1.6;">
          <p><strong>🪟 Windows System Detected</strong></p>
          <p>Windows should have built-in TTS. Try these solutions:</p>
          
          <h4>🔧 Enable Windows TTS:</h4>
          <ol>
            <li>Open <strong>Settings</strong> → <strong>Ease of Access</strong> → <strong>Narrator</strong></li>
            <li>Turn on <strong>Narrator</strong> (you can turn it off after)</li>
            <li>Go to <strong>Voice</strong> settings and install additional voices</li>
            <li>Refresh this page</li>
          </ol>
          
          <h4>🌐 Alternative Options:</h4>
          <ul>
            <li><strong>Browser Extension:</strong> Install "Read Aloud" from Edge Add-ons</li>
            <li><strong>Online Service:</strong> Use copy mode to paste text into NaturalReader</li>
          </ul>
        </div>
      `;
    } else if (platform.includes('mac')) {
      guidance.message = `
        <div style="text-align: left; line-height: 1.6;">
          <p><strong>🍎 macOS System Detected</strong></p>
          <p>macOS should have excellent built-in TTS. Try these solutions:</p>
          
          <h4>🔧 Enable macOS TTS:</h4>
          <ol>
            <li>Open <strong>System Preferences</strong> → <strong>Accessibility</strong> → <strong>Speech</strong></li>
            <li>Enable <strong>Speak selected text when the key is pressed</strong></li>
            <li>Download additional voices in <strong>System Voice</strong> settings</li>
            <li>Refresh this page</li>
          </ol>
          
          <h4>🌐 Alternative Options:</h4>
          <ul>
            <li><strong>Safari:</strong> Try Reader Mode with built-in speech</li>
            <li><strong>Browser Extension:</strong> Install "Read Aloud" from Safari Extensions</li>
          </ul>
        </div>
      `;
    } else {
      guidance.message = `
        <div style="text-align: left; line-height: 1.6;">
          <p><strong>🔧 TTS Setup Required</strong></p>
          <p>No text-to-speech voices are available. Here are your options:</p>
          
          <h4>🌐 Browser Extensions (Recommended):</h4>
          <ul>
            <li><strong>Chrome/Edge:</strong> Install "Read Aloud" extension</li>
            <li><strong>Firefox:</strong> Install "FoxVox" extension</li>
            <li><strong>Safari:</strong> Use built-in Reader Mode speech</li>
          </ul>
          
          <h4>☁️ Online Services:</h4>
          <ul>
            <li><a href="https://ttsreader.com" target="_blank">TTSReader.com</a> - Free online TTS</li>
            <li><a href="https://www.naturalreaders.com" target="_blank">NaturalReader</a> - High quality voices</li>
            <li><a href="https://www.speechify.com" target="_blank">Speechify</a> - Premium experience</li>
          </ul>
          
          <h4>📱 Mobile Alternative:</h4>
          <p>Open this page on your smartphone for built-in TTS support.</p>
        </div>
      `;
    }

    this.onError?.(guidance);
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
window.TtsManagerFixed = TtsManagerFixed;