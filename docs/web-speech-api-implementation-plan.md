# 🔊 Web Speech API + PDF.js Implementation Plan

## 📋 Executive Summary

This plan outlines a complete replacement of the current complex TTS system with a clean, native Web Speech API solution integrated directly with PDF.js. This approach eliminates external dependencies, reduces complexity, and provides a seamless user experience on GitHub Pages.

## 🎯 Goals

- **Simplify**: Replace multiple TTS managers with a single, focused implementation
- **Optimize**: Use native Web Speech API for maximum compatibility
- **Enhance**: Improve user experience with seamless PDF integration
- **Maintain**: Keep static site compatibility for GitHub Pages deployment

## 📊 Current State Analysis

### ❌ Issues with Current Implementation
1. **Over-complexity**: 4 different TTS managers causing conflicts
   - `UniversalTtsManager.js` (907 lines)
   - `CloudTtsManager.js` (462 lines) 
   - `TtsManager.js` (573 lines)
   - `TtsManagerFixed.js` (800+ lines)

2. **External Dependencies**: 
   - ResponsiveVoice API
   - Cloud TTS services
   - Multiple fallback providers

3. **User Experience Issues**:
   - Multiple modals and setup screens
   - Complex provider switching logic
   - Inconsistent error handling

### ✅ What's Working Well
- PDF.js integration with `pdfjs-dist`
- Text extraction using `page.getTextContent()`
- Comprehensive PDF viewer controls
- Astro-based static site architecture

## 🚀 Implementation Plan

### Phase 1: Clean Slate Setup (Day 1)

#### 1.1 Remove Existing TTS Files
```bash
# Files to delete:
rm library/public/UniversalTtsManager.js
rm library/public/CloudTtsManager.js  
rm library/public/TtsManager.js
rm library/src/components/CloudTtsManager.js
rm library/src/components/TtsManager.js
rm library/src/components/TtsManagerFixed.js
```

#### 1.2 Create New Simple TTS Manager
**File**: `library/public/SimpleTtsManager.js`

```javascript
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
      throw new Error('Speech synthesis not supported in this browser');
    }

    // Load voices with retry mechanism
    await this.loadVoices();
    this.isInitialized = true;
    
    return this.availableVoices.length > 0;
  }

  async loadVoices() {
    return new Promise((resolve) => {
      const loadVoicesAttempt = () => {
        this.availableVoices = speechSynthesis.getVoices();
        if (this.availableVoices.length > 0) {
          resolve();
        } else {
          // Retry after a short delay
          setTimeout(loadVoicesAttempt, 100);
        }
      };

      // Handle voiceschanged event
      speechSynthesis.addEventListener('voiceschanged', loadVoicesAttempt);
      loadVoicesAttempt();
    });
  }

  getVoices() {
    return this.availableVoices;
  }

  async speak(text, options = {}) {
    if (!this.isInitialized) {
      throw new Error('TTS not initialized');
    }

    this.stop(); // Stop any current speech

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance.rate = options.rate || 1.0;
    this.currentUtterance.pitch = options.pitch || 1.0;
    this.currentUtterance.volume = options.volume || 1.0;

    if (options.voice) {
      this.currentUtterance.voice = options.voice;
    }

    return new Promise((resolve, reject) => {
      this.currentUtterance.onstart = () => {
        this.isPlaying = true;
        this.isPaused = false;
        this.onStatusChange?.({ isPlaying: true, isPaused: false });
        resolve();
      };

      this.currentUtterance.onend = () => {
        this.isPlaying = false;
        this.isPaused = false;
        this.onStatusChange?.({ isPlaying: false, isPaused: false });
        this.onEnd?.();
      };

      this.currentUtterance.onerror = (event) => {
        this.isPlaying = false;
        this.isPaused = false;
        this.onStatusChange?.({ isPlaying: false, isPaused: false });
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      speechSynthesis.speak(this.currentUtterance);
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
```

### Phase 2: PDF Viewer Integration (Day 2)

#### 2.1 Simplified PdfViewer.astro Structure

**Key Changes to `library/src/components/PdfViewer.astro`:**

1. **Remove Complex TTS Code** (lines 152-1600+)
2. **Add Simple TTS Controls** to existing menu
3. **Streamline Text Extraction**
4. **Implement Clean Event Handlers**

#### 2.2 New TTS Controls in Menu
```astro
<!-- Replace existing TTS menu section with: -->
<div id="tts-menu-section" class="menu-section" style="display: none;">
  <h4 class="menu-section-title">🎵 Audio Controls</h4>
  <div class="menu-controls">
    <div class="control-row">
      <button id="tts-play-pause" class="menu-control-btn">
        <span class="icon">▶️</span>
        <span class="text">Play</span>
      </button>
      <button id="tts-stop" class="menu-control-btn">
        <span class="icon">⏹️</span>
        <span class="text">Stop</span>
      </button>
    </div>
    <div class="control-row">
      <label class="control-label">🎤 Voice:</label>
      <select id="voice-selector" class="menu-select">
        <option value="">Default Voice</option>
      </select>
    </div>
    <div class="control-row">
      <label class="control-label">⚡ Speed:</label>
      <select id="speed-selector" class="menu-select">
        <option value="0.75">0.75x</option>
        <option value="1.0" selected>1.0x</option>
        <option value="1.25">1.25x</option>
        <option value="1.5">1.5x</option>
        <option value="2.0">2.0x</option>
      </select>
    </div>
    <div class="control-row">
      <label class="menu-option">
        <input type="checkbox" id="auto-advance">
        <span class="option-text">🔄 Auto-advance pages</span>
      </label>
    </div>
  </div>
</div>

<!-- TTS Status Display -->
<div id="tts-status" class="tts-status" style="display: none;">
  <div class="status-message"></div>
</div>
```

#### 2.3 Simplified Script Section
```javascript
<script define:vars={{ pdfUrl, pdfjsWorkerSrc }}>
  // Global variables
  let currentPdfDoc = null;
  let currentPageNum = 1;
  let currentScale = 1.5;
  let totalPages = 0;
  let ttsManager = null;
  let currentPageText = '';
  let autoAdvance = false;

  // Initialize PDF and TTS
  async function initializePdfViewer() {
    try {
      // Initialize PDF (existing code)
      await loadPdf();
      
      // Initialize TTS
      await initializeTTS();
      
      // Setup event listeners
      setupEventListeners();
      
    } catch (error) {
      console.error('Initialization failed:', error);
    }
  }

  async function initializeTTS() {
    try {
      // Load SimpleTtsManager
      const script = document.createElement('script');
      script.src = '/SimpleTtsManager.js';
      script.onload = async () => {
        ttsManager = new SimpleTtsManager();
        const success = await ttsManager.initialize();
        
        if (success) {
          setupTTSControls();
          showTTSControls();
        } else {
          showTTSUnavailable();
        }
      };
      document.head.appendChild(script);
      
    } catch (error) {
      console.error('TTS initialization failed:', error);
      showTTSUnavailable();
    }
  }

  function setupTTSControls() {
    // Populate voice selector
    const voiceSelector = document.getElementById('voice-selector');
    const voices = ttsManager.getVoices();
    
    voiceSelector.innerHTML = '<option value="">Default Voice</option>';
    voices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${voice.name} (${voice.lang})`;
      voiceSelector.appendChild(option);
    });

    // Setup event listeners
    document.getElementById('tts-play-pause').addEventListener('click', toggleTTS);
    document.getElementById('tts-stop').addEventListener('click', stopTTS);
    document.getElementById('auto-advance').addEventListener('change', (e) => {
      autoAdvance = e.target.checked;
    });

    // TTS status updates
    ttsManager.onStatusChange = updateTTSStatus;
    ttsManager.onEnd = handleTTSEnd;
  }

  async function toggleTTS() {
    if (!ttsManager) return;

    const status = ttsManager.getStatus();
    
    if (status.isPlaying && !status.isPaused) {
      ttsManager.pause();
    } else if (status.isPaused) {
      ttsManager.resume();
    } else {
      await startTTS();
    }
  }

  async function startTTS() {
    if (!currentPageText) {
      currentPageText = await extractPageText(currentPageNum);
    }

    if (!currentPageText) {
      showTTSStatus('No text found on this page', 'warning');
      return;
    }

    try {
      const voiceSelector = document.getElementById('voice-selector');
      const speedSelector = document.getElementById('speed-selector');
      
      const selectedVoiceIndex = voiceSelector.value;
      const selectedVoice = selectedVoiceIndex ? ttsManager.getVoices()[selectedVoiceIndex] : null;
      const rate = parseFloat(speedSelector.value) || 1.0;

      await ttsManager.speak(currentPageText, {
        voice: selectedVoice,
        rate: rate
      });

    } catch (error) {
      console.error('TTS failed:', error);
      showTTSStatus(`Speech failed: ${error.message}`, 'error');
    }
  }

  function stopTTS() {
    if (ttsManager) {
      ttsManager.stop();
    }
  }

  async function extractPageText(pageNum) {
    if (!currentPdfDoc) return '';
    
    try {
      const page = await currentPdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      return textContent.items
        .filter(item => item.str.trim())
        .map(item => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
        
    } catch (error) {
      console.error('Text extraction failed:', error);
      return '';
    }
  }

  function updateTTSStatus(status) {
    const playPauseBtn = document.getElementById('tts-play-pause');
    if (!playPauseBtn) return;

    if (status.isPlaying && !status.isPaused) {
      playPauseBtn.innerHTML = '<span class="icon">⏸️</span><span class="text">Pause</span>';
    } else if (status.isPaused) {
      playPauseBtn.innerHTML = '<span class="icon">▶️</span><span class="text">Resume</span>';
    } else {
      playPauseBtn.innerHTML = '<span class="icon">▶️</span><span class="text">Play</span>';
    }
  }

  function handleTTSEnd() {
    if (autoAdvance && currentPageNum < totalPages) {
      setTimeout(async () => {
        await renderPage(currentPageNum + 1);
        currentPageText = ''; // Reset for new page
        await startTTS(); // Auto-start on new page
      }, 1000);
    }
  }

  function showTTSControls() {
    const ttsSection = document.getElementById('tts-menu-section');
    if (ttsSection) {
      ttsSection.style.display = 'block';
    }
  }

  function showTTSUnavailable() {
    const statusDiv = document.getElementById('tts-status');
    if (statusDiv) {
      statusDiv.innerHTML = `
        <div class="status-message warning">
          📖 Text-to-speech not available. 
          <a href="https://ttsreader.com" target="_blank">Try TTSReader.com</a>
        </div>
      `;
      statusDiv.style.display = 'block';
    }
  }

  function showTTSStatus(message, type = 'info') {
    const statusDiv = document.getElementById('tts-status');
    if (statusDiv) {
      statusDiv.innerHTML = `<div class="status-message ${type}">${message}</div>`;
      statusDiv.style.display = 'block';
      
      if (type !== 'error') {
        setTimeout(() => {
          statusDiv.style.display = 'none';
        }, 3000);
      }
    }
  }

  // Initialize when DOM is ready
  document.addEventListener('DOMContentLoaded', initializePdfViewer);
</script>
```

### Phase 3: Enhanced Features (Day 3)

#### 3.1 Text Chunking for Better Speech
```javascript
function chunkTextForTTS(text, maxLength = 200) {
  // Split by sentences for natural pauses
  const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

async function speakInChunks(text, options = {}) {
  const chunks = chunkTextForTTS(text);
  
  for (let i = 0; i < chunks.length; i++) {
    await ttsManager.speak(chunks[i], options);
    
    // Small pause between chunks
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}
```

#### 3.2 Keyboard Shortcuts
```javascript
document.addEventListener('keydown', (event) => {
  // Only handle shortcuts when not typing in inputs
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return;
  }

  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case ' ': // Ctrl/Cmd + Space - Toggle TTS
        event.preventDefault();
        toggleTTS();
        break;
      case 'ArrowRight': // Ctrl/Cmd + Right - Next page
        event.preventDefault();
        if (currentPageNum < totalPages) {
          renderPage(currentPageNum + 1);
        }
        break;
      case 'ArrowLeft': // Ctrl/Cmd + Left - Previous page
        event.preventDefault();
        if (currentPageNum > 1) {
          renderPage(currentPageNum - 1);
        }
        break;
    }
  }
});
```

#### 3.3 Reading Progress Persistence
```javascript
function saveReadingProgress() {
  const progress = {
    pdfUrl: pdfUrl,
    currentPage: currentPageNum,
    timestamp: Date.now()
  };
  localStorage.setItem('pdfReadingProgress', JSON.stringify(progress));
}

function loadReadingProgress() {
  try {
    const saved = localStorage.getItem('pdfReadingProgress');
    if (saved) {
      const progress = JSON.parse(saved);
      if (progress.pdfUrl === pdfUrl) {
        return progress.currentPage;
      }
    }
  } catch (error) {
    console.error('Failed to load reading progress:', error);
  }
  return 1;
}

// Auto-save progress when page changes
async function renderPage(num, scale = null) {
  // ... existing render code ...
  
  // Save progress after successful render
  saveReadingProgress();
}
```

### Phase 4: CSS Styling (Day 4)

#### 4.1 TTS Status Styles
```css
.tts-status {
  margin: 10px 0;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
}

.status-message {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-message.info {
  background: #d1ecf1;
  border: 1px solid #bee5eb;
  color: #0c5460;
}

.status-message.warning {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
}

.status-message.error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.status-message a {
  color: inherit;
  text-decoration: underline;
}
```

#### 4.2 Enhanced Menu Controls
```css
.menu-control-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  background: #f8f9fa;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.menu-control-btn:hover {
  background: #e9ecef;
  transform: translateY(-1px);
}

.menu-control-btn:active {
  transform: translateY(0);
}

.menu-control-btn .icon {
  font-size: 16px;
}

.control-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0;
}

.control-label {
  font-weight: 500;
  min-width: 60px;
  font-size: 14px;
}

.menu-select {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: white;
  font-size: 14px;
}
```

## 🎯 Key Benefits

### ✅ Immediate Benefits
1. **Reduced Complexity**: From 2800+ lines to ~300 lines of TTS code
2. **No External Dependencies**: Pure Web Speech API implementation
3. **Better Performance**: Eliminates multiple provider checks and fallbacks
4. **Cleaner UX**: Single, intuitive interface

### ✅ Long-term Benefits
1. **Maintainability**: Simple, focused codebase
2. **Reliability**: Native browser APIs are more stable
3. **Compatibility**: Works on all modern browsers
4. **Extensibility**: Easy to add features like highlighting

## 📋 Implementation Checklist

### Phase 1: Clean Slate ✅
- [ ] Remove existing TTS files
- [ ] Create SimpleTtsManager.js
- [ ] Test basic TTS functionality

### Phase 2: PDF Integration ✅
- [ ] Update PdfViewer.astro
- [ ] Implement text extraction
- [ ] Add TTS controls to menu
- [ ] Test with actual PDF files

### Phase 3: Enhanced Features ✅
- [ ] Add text chunking
- [ ] Implement keyboard shortcuts
- [ ] Add reading progress persistence
- [ ] Test auto-advance functionality

### Phase 4: Polish ✅
- [ ] Add CSS styling
- [ ] Implement error handling
- [ ] Add accessibility features
- [ ] Final testing and optimization

## 🚀 Expected Outcomes

1. **Simplified Architecture**: Single TTS manager instead of 4
2. **Better User Experience**: Seamless PDF + TTS integration
3. **Improved Reliability**: Native APIs instead of external services
4. **Enhanced Performance**: Faster loading and fewer dependencies
5. **Future-Proof**: Built on web standards

## 📱 Browser Compatibility

| Browser | TTS Support | Notes |
|---------|-------------|-------|
| Chrome 71+ | ✅ Excellent | Full Web Speech API support |
| Firefox 62+ | ✅ Good | Requires system voices |
| Safari 14+ | ✅ Excellent | Built-in high-quality voices |
| Edge 79+ | ✅ Excellent | Full Web Speech API support |
| Mobile Chrome | ✅ Good | Works on Android |
| Mobile Safari | ⚠️ Limited | iOS restrictions apply |

## 🔧 Fallback Strategy

For browsers/systems without TTS support:
1. **Graceful degradation**: Hide TTS controls
2. **Helpful guidance**: Link to external TTS services
3. **Copy functionality**: Easy text copying for external tools
4. **No broken experience**: PDF viewer works normally

This implementation provides a robust, maintainable solution that leverages native browser capabilities while maintaining excellent user experience across all scenarios.


---

Based on my analysis of the Web Speech API implementation plan and the current library structure, I can now provide a comprehensive assessment of whether this approach would work and potential CORS issues.

## 📋 Analysis Summary

After examining the implementation plan and current codebase, I can confirm that **the proposed Web Speech API approach would work well and should NOT encounter CORS issues**. Here's my detailed analysis:

## ✅ Why This Approach Will Work

### 1. **No CORS Issues Expected**
- **Web Speech API is browser-native**: The `speechSynthesis` API runs entirely in the browser without external network requests
- **Local file serving**: All components (PDF.js, SimpleTtsManager.js) are served from the same origin
- **Astro static site**: The project uses Astro with static file serving, eliminating cross-origin concerns
- **PDF.js integration**: Already working with `pdfjs-dist` package, text extraction is local

### 2. **Current Architecture Supports This**
- **Astro framework**: Perfect for static sites with client-side JavaScript
- **Existing PDF.js setup**: Already configured with worker (`pdf.worker.min.mjs`)
- **Component structure**: `PdfViewer.astro` already has TTS integration points
- **Package.json**: Simple dependencies (`astro`, `pdfjs-dist`) - no complex external services

### 3. **Significant Improvements Over Current System**

#### Current Problems (Confirmed):
- **4 different TTS managers** causing conflicts and complexity
- **External dependencies** (ResponsiveVoice, Cloud TTS services)
- **Complex provider switching logic** with multiple fallbacks
- **Over 2,700+ lines of TTS code** across multiple files

#### Proposed Solution Benefits:
- **Single 200-line SimpleTtsManager** replacing all complex managers
- **Native browser API** - no external services or API keys needed
- **Simplified integration** with existing PDF viewer
- **Better user experience** with immediate availability

## 🔧 Implementation Feasibility

### Phase 1: Clean Slate ✅
```bash
# Safe to remove these complex files:
rm library/src/components/CloudTtsManager.js      # 513 lines
rm library/src/components/TtsManager.js           # 577 lines  
rm library/src/components/TtsManagerFixed.js      # 804 lines
```

### Phase 2: Simple Integration ✅
- Replace with single `SimpleTtsManager.js` in `/public/` directory
- Modify existing `PdfViewer.astro` (already has TTS menu structure)
- Use existing PDF.js text extraction (`page.getTextContent()`)

### Phase 3: Enhanced Features ✅
- Text chunking for better speech flow
- Keyboard shortcuts
- Reading progress persistence
- All achievable with native APIs

## 🚀 Recommended Implementation Plan

### 1. **Immediate Benefits**
- **Eliminate external dependencies** and potential API failures
- **Reduce codebase complexity** by ~90% (from 2,700+ to ~300 lines)
- **Improve reliability** with native browser APIs
- **Faster loading** without external script dependencies

### 2. **Browser Compatibility**
- **Excellent support**: Web Speech API supported in all modern browsers
- **Graceful degradation**: Plan includes fallback messaging for unsupported browsers
- **No additional setup**: Works immediately without user configuration

### 3. **Deployment Advantages**
- **GitHub Pages compatible**: No server-side requirements
- **No API keys needed**: Eliminates configuration complexity
- **Offline capable**: Works without internet connection
- **Privacy friendly**: No data sent to external services

## 🎯 Specific CORS Considerations

### ✅ No CORS Issues Because:
1. **Same-origin serving**: All files served from same domain
2. **No external API calls**: Web Speech API is browser-internal
3. **Local PDF processing**: PDF.js processes files locally
4. **Static asset serving**: Astro serves all files from same origin

### ✅ Current Setup Already Handles:
- PDF worker files served locally (`/pdf.worker.min.mjs`)
- JavaScript modules loaded from same origin
- No cross-domain requests in the proposed architecture

## 📊 Risk Assessment: **LOW RISK**

### Potential Challenges:
1. **Voice availability varies by browser/OS** - Plan addresses with fallback messaging
2. **Speech quality depends on system voices** - Acceptable trade-off for simplicity
3. **No cloud voice options** - But eliminates complexity and dependencies

### Mitigation Strategies:
1. **Clear user guidance** when TTS unavailable
2. **Fallback to external TTS reader** (link provided in plan)
3. **Progressive enhancement** - PDF reading works without TTS

## 🏗️ Architecture Recommendation

I recommend **proceeding with the Web Speech API implementation** because:

1. **Significantly simpler** than current complex system
2. **No CORS or external dependency issues**
3. **Better user experience** with immediate availability
4. **Easier maintenance** with single, focused implementation
5. **Perfect fit** for static site deployment

The proposed plan is well-architected, addresses real problems in the current codebase, and provides a much cleaner solution that will work reliably across different deployment scenarios.
