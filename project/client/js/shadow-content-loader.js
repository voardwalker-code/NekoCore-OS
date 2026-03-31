// ── Client · Shadow Content Loader ────────────────────────────────────────────────────
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
   ║  SHADOW CONTENT LOADER                                         ║
   ║  Safe fetch and inject of app payloads into shadow roots       ║
   ║  Phase D-2: Shadow Content Loader                             ║
   ║  Handles: HTML parsing, CSS isolation, script execution      ║
   ║  Provides: error boundary, fallback UI for failed loads       ║
   ╚══════════════════════════════════════════════════════════════╝ */

'use strict';

/**
 * ShadowContentLoader: fetches app package HTML and injects it safely
 * into an AppWindow's shadow root with CSS isolation and script execution.
 * 
 * Workflow:
 * 1. Fetch /apps/[appName]/index.html
 * 2. Parse HTML to extract body content, styles, and scripts
 * 3. Inject body/styles into shadow root
 * 4. Execute scripts in order within the shadow root context
 * 5. Provide error boundary UI if load fails
 */

class ShadowContentLoader {
  // constructor()
  // WHAT THIS DOES: constructor is a helper used by this module's main flow.
  // WHY IT EXISTS: it keeps repeated logic in one reusable place.
  // HOW TO USE IT: call constructor(...) where this helper behavior is needed.
  constructor(appWindow, packagePath, packageEntry) {
    this.appWindow = appWindow;
    this.packagePath = packagePath || ('apps/' + appWindow.tabName);
    const normalizedEntry = typeof packageEntry === 'string'
      ? packageEntry.replace(/^\/+/, '').trim()
      : '';
    this.packageEntry = normalizedEntry || (this.packagePath + '/index.html');
    this.loaded = false;
    this.loadError = null;
  }

  /**
   * Fetch the app package HTML from disk.
   * @returns {Promise<string>} HTML content or error
   */
  async fetchPackageHTML() {
    try {
      const response = await fetch('/' + this.packageEntry);
      // if()
      // WHAT THIS DOES: if is a helper used by this module's main flow.
      // WHY IT EXISTS: it keeps repeated logic in one reusable place.
      // HOW TO USE IT: call if(...) where this helper behavior is needed.
      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ' ' + response.statusText);
      }
      const html = await response.text();
      return html;
    } catch (err) {
      this.loadError = err.message;
      console.error('[ShadowContentLoader] fetch failed for ' + this.packageEntry + ':', err.message);
      throw err;
    }
  }

  /**
   * Parse HTML to extract body content, styles, and scripts.
   * @param {string} html - Full HTML document
   * @returns {Object} { bodyContent, styles, scripts, externalStyles }
   */
  // parseHTML()
  // WHAT THIS DOES: parseHTML reshapes data from one form into another.
  // WHY IT EXISTS: conversion rules live here so the same transformation is reused.
  // HOW TO USE IT: pass input data into parseHTML(...) and use the transformed output.
  parseHTML(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Extract body content (all children of <body>)
    const bodyEl = temp.querySelector('body');
    const bodyContent = bodyEl ? Array.from(bodyEl.childNodes) : [];

    // Extract inline <style> tags
    const styles = Array.from(temp.querySelectorAll('style')).map((el) => ({
      type: 'inline',
      content: el.textContent,
      media: el.media || null
    }));

    // Extract external <link rel="stylesheet"> references
    const externalStyles = Array.from(temp.querySelectorAll('link[rel="stylesheet"]')).map((el) => ({
      type: 'external',
      href: el.href,
      media: el.media || null
    }));

    // Extract <script> tags (preserve order)
    const scripts = Array.from(temp.querySelectorAll('script')).map((el) => ({
      type: el.type || 'text/javascript',
      src: el.src || null,
      content: el.textContent,
      async: el.async,
      defer: el.defer
    }));

    return {
      bodyContent,
      styles,
      scripts,
      externalStyles
    };
  }

  /**
   * Inject parsed content into the shadow root.
   * @param {Object} parsed - Result from parseHTML()
   */
  injectContent(parsed) {
    if (!this.appWindow.shadowRoot) {
      throw new Error('AppWindow shadow root not available');
    }

    const shadowRoot = this.appWindow.shadowRoot;

    // 1. Inject external stylesheets (as <link> elements in shadow root)
    //    Note: External stylesheets in shadow roots still apply to shadow content
    for (const styleRef of parsed.externalStyles) {
      const linkEl = document.createElement('link');
      linkEl.rel = 'stylesheet';
      linkEl.href = styleRef.href;
      if (styleRef.media) linkEl.media = styleRef.media;
      shadowRoot.appendChild(linkEl);
    }

    // 2. Inject inline styles
    for (const style of parsed.styles) {
      const styleEl = document.createElement('style');
      if (style.media) styleEl.media = style.media;
      styleEl.textContent = style.content;
      shadowRoot.appendChild(styleEl);
    }

    // 3. Inject body content (HTML nodes)
    for (const node of parsed.bodyContent) {
      // Clone to avoid removing from temp document
      const clone = node.cloneNode(true);
      shadowRoot.appendChild(clone);
    }

    // 4. Execute scripts in order
    //    Scripts run in the global window scope (shadow root scripts can access window/globals)
    //    but DOM queries by scripts will be scoped to their context
    for (const scriptDef of parsed.scripts) {
      try {
        if (scriptDef.src) {
          // External script via src attribute
          this.executeExternalScript(scriptDef.src);
        } else if (scriptDef.content) {
          // Inline script content
          this.executeInlineScript(scriptDef.content);
        }
      } catch (err) {
        console.warn('[ShadowContentLoader] script execution error:', err.message);
        // Non-fatal: continue with other scripts
      }
    }
  }

  /**
   * Execute an external script by creating a <script> tag in the shadow root.
   * @param {string} src - Script source URL
   */
  executeExternalScript(src) {
    return new Promise((resolve, reject) => {
      const scriptEl = document.createElement('script');
      scriptEl.src = src;
      scriptEl.onerror = () => {
        reject(new Error('Failed to load external script: ' + src));
      };
      scriptEl.onload = () => {
        resolve();
      };
      // Append to shadow root so it executes in that context
      this.appWindow.shadowRoot.appendChild(scriptEl);
    });
  }

  /**
   * Execute inline script content in the global window scope.
   * Scripts need access to window globals, so we eval in the outer scope.
   * @param {string} code - JavaScript code to execute
   */
  executeInlineScript(code) {
    if (!code || !code.trim()) return;
    try {
      // eslint-disable-next-line no-eval
      new Function(code)();
    } catch (err) {
      console.error('[ShadowContentLoader] inline script execution error:', err.message);
      throw err;
    }
  }

  /**
   * Inject error boundary UI when load fails.
   * @param {string} errorMessage - Error description
   */
  injectErrorBoundary(errorMessage) {
    if (!this.appWindow.shadowRoot) return;

    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = `
      padding: 2rem;
      background: #f5f5f5;
      color: #333;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      border-radius: 8px;
      margin: 1rem;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Failed to Load App';
    title.style.cssText = 'margin: 0 0 1rem 0; color: #d32f2f;';

    const message = document.createElement('p');
    message.textContent = errorMessage || 'An error occurred while loading this app. Please try again.';
    message.style.cssText = 'margin: 0; color: #666; font-size: 0.9rem;';

    const retryBtn = document.createElement('button');
    retryBtn.textContent = 'Retry';
    retryBtn.style.cssText = `
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
    `;
    retryBtn.onclick = () => {
      this.appWindow.clear();
      this.load().catch((err) => {
        console.error('[ShadowContentLoader] retry failed:', err.message);
      });
    };

    errorContainer.appendChild(title);
    errorContainer.appendChild(message);
    errorContainer.appendChild(retryBtn);

    this.appWindow.shadowRoot.appendChild(errorContainer);
  }

  /**
   * Load the app package and inject content into shadow root.
   * Main entry point for the loader.
   * @returns {Promise<boolean>} true if successful, false if failed
   */
  async load() {
    if (this.loaded) {
      console.warn('[ShadowContentLoader] already loaded for ' + this.appWindow.tabName);
      return true;
    }

    try {
      // Step 1: Fetch HTML
      const html = await this.fetchPackageHTML();

      // Step 2: Parse HTML
      const parsed = this.parseHTML(html);

      // Step 3: Inject into shadow root
      this.injectContent(parsed);

      this.loaded = true;
      console.log('[ShadowContentLoader] successfully loaded ' + this.appWindow.tabName);
      return true;
    } catch (err) {
      console.error('[ShadowContentLoader] load failed:', err.message);
      this.loadError = err.message;
      this.injectErrorBoundary('Could not load ' + this.appWindow.tabName + ': ' + err.message);
      return false;
    }
  }

  /**
   * Unload content from shadow root (clear for reload).
   */
  unload() {
    if (this.appWindow && this.appWindow.shadowRoot) {
      this.appWindow.clear();
    }
    this.loaded = false;
    this.loadError = null;
  }

  /**
   * Check if content is loaded.
   */
  isLoaded() {
    return this.loaded;
  }

  /**
   * Get last error message (if any).
   */
  getError() {
    return this.loadError;
  }
}

// ── Global registry for ShadowContentLoader instances ────────────────────

window.__shadowLoaderRegistry = window.__shadowLoaderRegistry || new Map();

/**
 * Factory function to create or retrieve a ShadowContentLoader instance.
 * @param {AppWindow} appWindow - AppWindow instance
 * @param {string} packagePath - Optional custom package path (default: apps/{tabName})
 * @returns {ShadowContentLoader} Loader instance
 */
// getOrCreateShadowLoader()
// WHAT THIS DOES: getOrCreateShadowLoader reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getOrCreateShadowLoader(...), then use the returned value in your next step.
function getOrCreateShadowLoader(appWindow, packagePath, packageEntry) {
  const key = appWindow.tabName;
  let loader = window.__shadowLoaderRegistry.get(key);
  if (!loader) {
    loader = new ShadowContentLoader(appWindow, packagePath, packageEntry);
    window.__shadowLoaderRegistry.set(key, loader);
  } else {
    if (packagePath) loader.packagePath = packagePath;
    if (typeof packageEntry === 'string' && packageEntry.trim()) {
      loader.packageEntry = packageEntry.replace(/^\/+/, '').trim();
    } else if (packagePath) {
      loader.packageEntry = packagePath + '/index.html';
    }
  }
  return loader;
}

/**
 * Retrieve an existing ShadowContentLoader without creating.
 * @param {string} tabName - App tab identifier
 * @returns {ShadowContentLoader|null} Loader instance or null
 */
// getShadowLoader()
// WHAT THIS DOES: getShadowLoader reads or finds data and gives it back.
// WHY IT EXISTS: it keeps "read" logic in one place so other code stays simple.
// HOW TO USE IT: call getShadowLoader(...), then use the returned value in your next step.
function getShadowLoader(tabName) {
  return window.__shadowLoaderRegistry.get(tabName) || null;
}
