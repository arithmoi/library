/**
 * Touch Optimizer
 * Mobile touch interactions and gesture support
 */
window.TouchOptimizer = class TouchOptimizer {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.lastTap = 0;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.isInitialized = false;
    
    // Configuration
    this.config = {
      doubleTapDelay: 500,
      swipeThreshold: 50,
      swipeVelocityThreshold: 0.3,
      longPressDelay: 500
    };
  }

  initialize() {
    if (this.isInitialized) return;
    
    this.setupTouchGestures();
    this.setupKeyboardShortcuts();
    this.isInitialized = true;
    
    console.log('Touch Optimizer initialized');
  }

  setupTouchGestures() {
    // Double-tap to play/pause
    this.container.addEventListener('touchend', (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - this.lastTap;
      
      if (tapLength < this.config.doubleTapDelay && tapLength > 0) {
        e.preventDefault();
        this.handleDoubleTap(e);
      }
      
      this.lastTap = currentTime;
    });

    // Swipe gestures for page navigation
    this.setupSwipeNavigation();
    
    // Long press for menu
    this.setupLongPress();
    
    // Pinch zoom (if supported)
    this.setupPinchZoom();
  }

  setupSwipeNavigation() {
    this.container.addEventListener('touchstart', (e) => {
      this.touchStartX = e.changedTouches[0].screenX;
      this.touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    this.container.addEventListener('touchend', (e) => {
      this.touchEndX = e.changedTouches[0].screenX;
      this.touchEndY = e.changedTouches[0].screenY;
      this.handleSwipe();
    }, { passive: true });
  }

  setupLongPress() {
    let longPressTimer;
    
    this.container.addEventListener('touchstart', (e) => {
      longPressTimer = setTimeout(() => {
        this.handleLongPress(e);
      }, this.config.longPressDelay);
    });

    this.container.addEventListener('touchend', () => {
      clearTimeout(longPressTimer);
    });

    this.container.addEventListener('touchmove', () => {
      clearTimeout(longPressTimer);
    });
  }

  setupPinchZoom() {
    let initialDistance = 0;
    let currentScale = 1;

    this.container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        initialDistance = this.getDistance(e.touches[0], e.touches[1]);
      }
    });

    this.container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = this.getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialDistance;
        
        if (Math.abs(scale - currentScale) > 0.1) {
          this.handlePinchZoom(scale);
          currentScale = scale;
        }
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Only handle shortcuts when not typing in inputs
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      // Handle keyboard shortcuts
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case ' ': // Ctrl/Cmd + Space - Toggle TTS
            event.preventDefault();
            this.callbacks.onTogglePlayback?.();
            break;
          case 'ArrowRight': // Ctrl/Cmd + Right - Next page
            event.preventDefault();
            this.callbacks.onNextPage?.();
            break;
          case 'ArrowLeft': // Ctrl/Cmd + Left - Previous page
            event.preventDefault();
            this.callbacks.onPreviousPage?.();
            break;
          case '=': // Ctrl/Cmd + = - Zoom in
          case '+':
            event.preventDefault();
            this.callbacks.onZoomIn?.();
            break;
          case '-': // Ctrl/Cmd + - - Zoom out
            event.preventDefault();
            this.callbacks.onZoomOut?.();
            break;
        }
      } else {
        // Non-modifier shortcuts
        switch (event.key) {
          case ' ': // Space - Toggle playback
            event.preventDefault();
            this.callbacks.onTogglePlayback?.();
            break;
          case 'ArrowRight': // Right arrow - Next page
            event.preventDefault();
            this.callbacks.onNextPage?.();
            break;
          case 'ArrowLeft': // Left arrow - Previous page
            event.preventDefault();
            this.callbacks.onPreviousPage?.();
            break;
          case 'Escape': // Escape - Stop/close
            event.preventDefault();
            this.callbacks.onStop?.();
            break;
          case 'f': // F - Toggle fullscreen
          case 'F':
            event.preventDefault();
            this.callbacks.onToggleFullscreen?.();
            break;
          case 'm': // M - Toggle menu
          case 'M':
            event.preventDefault();
            this.callbacks.onToggleMenu?.();
            break;
        }
      }
    });
  }

  handleDoubleTap(event) {
    console.log('Double tap detected');
    this.callbacks.onTogglePlayback?.();
  }

  handleSwipe() {
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Check if it's a horizontal swipe
    if (absDeltaX > this.config.swipeThreshold && absDeltaX > absDeltaY) {
      if (deltaX > 0) {
        // Swipe right - previous page
        console.log('Swipe right detected');
        this.callbacks.onPreviousPage?.();
      } else {
        // Swipe left - next page
        console.log('Swipe left detected');
        this.callbacks.onNextPage?.();
      }
    }
    
    // Check if it's a vertical swipe
    else if (absDeltaY > this.config.swipeThreshold && absDeltaY > absDeltaX) {
      if (deltaY > 0) {
        // Swipe down - show menu
        console.log('Swipe down detected');
        this.callbacks.onShowMenu?.();
      } else {
        // Swipe up - hide menu
        console.log('Swipe up detected');
        this.callbacks.onHideMenu?.();
      }
    }
  }

  handleLongPress(event) {
    console.log('Long press detected');
    this.callbacks.onLongPress?.(event);
  }

  handlePinchZoom(scale) {
    console.log('Pinch zoom detected:', scale);
    this.callbacks.onPinchZoom?.(scale);
  }

  getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Utility methods for mobile optimization
  static isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  static isTablet() {
    return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
  }

  static isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  static getViewportSize() {
    return {
      width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
      height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    };
  }

  // Prevent default touch behaviors that might interfere
  preventDefaultTouchBehaviors() {
    // Prevent pull-to-refresh
    document.body.style.overscrollBehavior = 'none';
    
    // Prevent zoom on double-tap (iOS Safari)
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    });

    // Prevent context menu on long press
    this.container.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  // Enable smooth scrolling for better mobile experience
  enableSmoothScrolling() {
    this.container.style.scrollBehavior = 'smooth';
    this.container.style.webkitOverflowScrolling = 'touch';
  }

  // Optimize for mobile performance
  optimizeForMobile() {
    if (TouchOptimizer.isMobile()) {
      this.preventDefaultTouchBehaviors();
      this.enableSmoothScrolling();
      
      // Add mobile-specific CSS classes
      this.container.classList.add('mobile-optimized');
      
      // Reduce animation complexity on mobile
      document.body.classList.add('mobile-device');
    }
  }

  destroy() {
    // Remove event listeners
    this.container.removeEventListener('touchend', this.handleDoubleTap);
    this.container.removeEventListener('touchstart', this.setupSwipeNavigation);
    this.container.removeEventListener('touchend', this.setupSwipeNavigation);
    
    this.isInitialized = false;
  }
}

// CSS for mobile optimizations
export const touchOptimizationStyles = `
  .mobile-optimized {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }

  .mobile-device {
    /* Reduce animations on mobile for better performance */
  }

  .mobile-device * {
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
  }

  /* Touch-friendly button sizes */
  @media (max-width: 768px) {
    button, .clickable {
      min-height: 44px;
      min-width: 44px;
      padding: 12px;
    }
    
    .pdf-controls button {
      min-height: 44px;
      min-width: 44px;
    }
  }
`;