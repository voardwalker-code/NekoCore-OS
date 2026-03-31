// ── Client · App Window ────────────────────────────────────────────────────
//
// HOW THIS MODULE WORKS:
// This client module drives browser-side behavior and state updates for UI
// features.
//
// WHAT USES THIS:
// Used by related flows in its subsystem. Keep call contracts stable during
// readability-only edits.
//
// EXPORTS:
// Exposed API includes: window-attached API object.
// ─────────────────────────────────────────────────────────────────────────────

/* ╔══════════════════════════════════════════════════════════════╗
   ║  APPWINDOW CLASS                                               ║
   ║  Shadow Root host for isolated app content & styles          ║
   ║  Phase D-1: Shadow AppWindow Loader                          ║
   ║  Replaces traditional .wm-content iframes with shadow roots  ║
   ║  Provides: open(), focus(), close() lifecycle hooks          ║
   ║  Compatibility: Non-breaking; coexists with legacy windows   ║
   ╚══════════════════════════════════════════════════════════════╝ */

'use strict';

/**
 * AppWindow class: wraps a window shell and provides shadow root hosting
 * for isolated app content (styles cannot bleed into shell or other apps).
 * 
 * Lifecycle:
 * - constructor(tabName): creates shell and shadow root
 * - open(): displays window, triggers onOpen hook
 * - focus(): brings window to front, triggers onFocus hook
 * - close(): hides window, triggers onClose hook
 * 
 * Shadow root is created in the window's content region for style isolation.
 * All app content should be injected into the shadow root, not the light DOM.
 */

class AppWindow {
  // constructor()
  // WHAT THIS DOES: constructor is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call constructor(...) where this helper behavior is needed.
  constructor(tabName, appMetadata = {}) {
    this.tabName = tabName;
    this.appMetadata = appMetadata;
    this.meta = null;
    this.shadowRoot = null;
    this.isOpen = false;
    
    // Lifecycle hooks
    this.onOpen = null;
    this.onFocus = null;
    this.onClose = null;
    
    // Window state tracking
    this.state = {
      maximized: false,
      snapState: null,
      zIndex: 10
    };
  }

  /**
   * Initialize the window shell and attach shadow root.
   * This is called once when the window is first created.
   * Depends on: windowManager global, getWindowApp() function
   */
  // initialize()
  // WHAT THIS DOES: initialize is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call initialize(...) where this helper behavior is needed.
  initialize() {
    if (this.meta) return; // Already initialized
    
    // Ensure windowManager is available
    // if()
    // WHAT THIS DOES: if is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call if(...) where this helper behavior is needed.
    if (typeof windowManager === 'undefined') {
      console.error('[AppWindow] windowManager not initialized; skipping ' + this.tabName);
      return;
    }

    // Get the existing window metadata or create stub
    this.meta = windowManager.windows.get(this.tabName);
    // if()
    // WHAT THIS DOES: if is a helper used by this module's main flow.
    // WHY IT EXISTS: it keeps repeated logic in one reusable place.
    // HOW TO USE IT: call if(...) where this helper behavior is needed.
    if (!this.meta) {
      console.warn('[AppWindow] window ' + this.tabName + ' not found in windowManager');
      return;
    }

    // Attach shadow root to the content region
    const contentEl = this.meta.el.querySelector('.wm-content');
    if (!contentEl) {
      console.error('[AppWindow] content region not found for ' + this.tabName);
      return;
    }

    try {
      // Create shadow root with 'open' mode (allows external script access if needed)
      // mode 'open' enables document.querySelector on the shadow root from outside
      this.shadowRoot = contentEl.attachShadow({ mode: 'open' });
      
      // Add a style element to the shadow root for app-scoped styling
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        :host {
          display: contents;
        }
        * {
          box-sizing: border-box;
        }
      `;
      this.shadowRoot.appendChild(styleEl);

      // Mark the meta object with shadow root host for D-2 loader
      this.meta.__shadowHost = true;
      this.meta.__shadowRoot = this.shadowRoot;

      console.log('[AppWindow] shadow root initialized for ' + this.tabName);
    } catch (err) {
      console.error('[AppWindow] failed to attach shadow root to ' + this.tabName + ':', err.message);
      this.shadowRoot = null;
    }
  }

  /**
   * Open the window (show and focus).
   * Triggers onOpen hook if provided.
   */
  open() {
    if (!this.meta) {
      console.warn('[AppWindow] meta not initialized for ' + this.tabName);
      return;
    }

    if (typeof openWindow !== 'function') {
      console.warn('[AppWindow] openWindow function not available');
      return;
    }

    this.isOpen = true;
    openWindow(this.tabName); // Delegates to existing window-manager function

    if (typeof this.onOpen === 'function') {
      try {
        this.onOpen.call(this);
      } catch (err) {
        console.error('[AppWindow] onOpen hook error:', err.message);
      }
    }
  }

  /**
   * Bring the window to front.
   * Triggers onFocus hook if provided.
   */
  focus() {
    if (!this.meta) {
      console.warn('[AppWindow] meta not initialized for ' + this.tabName);
      return;
    }

    if (typeof focusWindow !== 'function') {
      console.warn('[AppWindow] focusWindow function not available');
      return;
    }

    focusWindow(this.tabName); // Delegates to existing window-manager function

    if (typeof this.onFocus === 'function') {
      try {
        this.onFocus.call(this);
      } catch (err) {
        console.error('[AppWindow] onFocus hook error:', err.message);
      }
    }
  }

  /**
   * Close the window (hide).
   * Triggers onClose hook if provided.
   */
  close() {
    if (!this.meta) {
      console.warn('[AppWindow] meta not initialized for ' + this.tabName);
      return;
    }

    if (typeof closeWindow !== 'function') {
      console.warn('[AppWindow] closeWindow function not available');
      return;
    }

    this.isOpen = false;
    closeWindow(this.tabName); // Delegates to existing window-manager function

    if (typeof this.onClose === 'function') {
      try {
        this.onClose.call(this);
      } catch (err) {
        console.error('[AppWindow] onClose hook error:', err.message);
      }
    }
  }

  /**
   * Inject HTML content into the shadow root.
   * Used by D-2 Shadow Content Loader to insert fetched payloads.
   * @param {string} html - HTML content to inject
   * @param {boolean} preserveInnerScripts - if true, scripts already in shadow root are left alone
   */
  injectHTML(html, preserveInnerScripts = true) {
    if (!this.shadowRoot) {
      console.warn('[AppWindow] shadow root not available for ' + this.tabName);
      return false;
    }

    try {
      // Create a temporary container to parse the HTML
      const temp = document.createElement('div');
      temp.innerHTML = html;

      // Move all child nodes from temp to shadow root
      while (temp.firstChild) {
        this.shadowRoot.appendChild(temp.firstChild);
      }

      return true;
    } catch (err) {
      console.error('[AppWindow] failed to inject HTML:', err.message);
      return false;
    }
  }

  /**
   * Inject CSS styles into the shadow root for app-scoped styling.
   * Styles in the shadow root do not affect the shell or other apps.
   * @param {string} css - CSS text to inject
   */
  injectCSS(css) {
    if (!this.shadowRoot) {
      console.warn('[AppWindow] shadow root not available for ' + this.tabName);
      return false;
    }

    try {
      const styleEl = document.createElement('style');
      styleEl.textContent = css;
      this.shadowRoot.appendChild(styleEl);
      return true;
    } catch (err) {
      console.error('[AppWindow] failed to inject CSS:', err.message);
      return false;
    }
  }

  /**
   * Clear all shadow root content (for unload or reset).
   */
  clear() {
    if (this.shadowRoot) {
      const children = Array.from(this.shadowRoot.childNodes);
      children.forEach((node) => {
        if (node.tagName !== 'STYLE' || node === this.getBaseStyle()) {
          node.remove();
        }
      });
    }
  }

  /**
   * Get reference to the shadow root's base style element.
   * Used to preserve default styling when clearing.
   */
  getBaseStyle() {
    if (!this.shadowRoot) return null;
    const styles = this.shadowRoot.querySelectorAll('style');
    return styles.length > 0 ? styles[0] : null;
  }

  /**
   * Query elements inside the shadow root.
   * @param {string} selector - CSS selector
   * @returns {Element} First matching element or null
   */
  querySelector(selector) {
    if (!this.shadowRoot) return null;
    return this.shadowRoot.querySelector(selector);
  }

  /**
   * Query all elements inside the shadow root.
   * @param {string} selector - CSS selector
   * @returns {NodeList} Matching elements
   */
  querySelectorAll(selector) {
    if (!this.shadowRoot) return [];
    return this.shadowRoot.querySelectorAll(selector);
  }

  /**
   * Get the element reference for the window shell.
   */
  getElement() {
    return this.meta ? this.meta.el : null;
  }

  /**
   * Get the shadow root element.
   */
  getShadowRoot() {
    return this.shadowRoot;
  }

  /**
   * Get the content container in light DOM (before shadow root).
   */
  getContentElement() {
    return this.meta ? this.meta.el.querySelector('.wm-content') : null;
  }
}

// ── Global registry for AppWindow instances (optional factory pattern) ────────

window.__appWindowRegistry = window.__appWindowRegistry || new Map();

/**
 * Factory function to create or retrieve an AppWindow instance.
 * @param {string} tabName - App tab identifier
 * @param {Object} appMetadata - Optional app metadata
 * @returns {AppWindow} AppWindow instance
 */
// getOrCreateAppWindow()
// WHAT THIS DOES: getOrCreateAppWindow reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getOrCreateAppWindow(...), then use the returned value in your next step.
function getOrCreateAppWindow(tabName, appMetadata = {}) {
  let appWindow = window.__appWindowRegistry.get(tabName);
  if (!appWindow) {
    appWindow = new AppWindow(tabName, appMetadata);
    appWindow.initialize();
    window.__appWindowRegistry.set(tabName, appWindow);
  }
  return appWindow;
}

/**
 * Retrieve an existing AppWindow instance without creating.
 * @param {string} tabName - App tab identifier
 * @returns {AppWindow|null} AppWindow instance or null
 */
// getAppWindow()
// WHAT THIS DOES: getAppWindow reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getAppWindow(...), then use the returned value in your next step.
function getAppWindow(tabName) {
  return window.__appWindowRegistry.get(tabName) || null;
}
