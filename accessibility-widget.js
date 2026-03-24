/**
 * Accessibility Widget v1.0
 * A premium, zero-dependency accessibility overlay for any website.
 * Drop-in replacement for paid accessibility apps.
 *
 * Usage:
 *   <script src="accessibility-widget.js"
 *     data-position="bottom-right"
 *     data-color="#6c5ce7"
 *     data-size="56">
 *   </script>
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Configuration                                                      */
  /* ------------------------------------------------------------------ */
  var script = document.currentScript || document.querySelector('script[src*="accessibility-widget"]');
  var CFG = {
    position: (script && script.dataset.position) || 'bottom-right',
    color: (script && script.dataset.color) || '#6c5ce7',
    size: parseInt((script && script.dataset.size) || '56', 10),
  };

  var STORAGE_KEY = 'a11y_widget_prefs';
  var PREFIX = 'a11y-';
  var root = document.documentElement;

  /* ------------------------------------------------------------------ */
  /*  State                                                              */
  /* ------------------------------------------------------------------ */
  var defaults = {
    fontSize: 100,
    lineHeight: 0,
    letterSpacing: 0,
    wordSpacing: 0,
    fontFamily: 'default',
    textAlign: 'default',
    contrast: 'default',
    saturation: 'default',
    invertColors: false,
    highlightLinks: false,
    highlightHeadings: false,
    bigCursor: false,
    readingGuide: false,
    focusIndicator: false,
    hideImages: false,
    stopAnimations: false,
    readingMask: false,
    ttsSpeed: 1,
    activeProfile: null,
  };

  var state = loadPrefs();
  var panelOpen = false;
  var ttsUtterance = null;
  var ttsActive = false;
  var ttsPaused = false;

  /* ------------------------------------------------------------------ */
  /*  Persistence                                                        */
  /* ------------------------------------------------------------------ */
  function loadPrefs() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var saved = JSON.parse(raw);
        var merged = {};
        for (var k in defaults) merged[k] = defaults[k];
        for (var k2 in saved) if (k2 in defaults) merged[k2] = saved[k2];
        return merged;
      }
    } catch (e) {}
    var copy = {};
    for (var k3 in defaults) copy[k3] = defaults[k3];
    return copy;
  }

  function savePrefs() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ------------------------------------------------------------------ */
  /*  CSS Injection                                                      */
  /* ------------------------------------------------------------------ */
  function injectStyles() {
    var pos = CFG.position.split('-');
    var vPos = pos[0] || 'bottom';
    var hPos = pos[1] || 'right';
    var btnOffset = '20px';
    var panelBottom = (CFG.size + 30) + 'px';

    var css = `
/* ============ OpenDyslexic font ============ */
@import url('https://fonts.googleapis.com/css2?family=OpenDyslexic&display=swap');

/* ============ Widget Button ============ */
#a11y-widget-btn {
  position: fixed;
  ${vPos}: ${btnOffset};
  ${hPos}: ${btnOffset};
  width: ${CFG.size}px;
  height: ${CFG.size}px;
  border-radius: 50%;
  background: ${CFG.color};
  border: none;
  cursor: pointer;
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3), 0 0 0 0 ${CFG.color}40;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  padding: 0;
  outline: none;
}
#a11y-widget-btn:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 28px rgba(0,0,0,0.4);
}
#a11y-widget-btn:focus-visible {
  outline: 3px solid #fff;
  outline-offset: 3px;
}
#a11y-widget-btn svg {
  width: ${Math.round(CFG.size * 0.55)}px;
  height: ${Math.round(CFG.size * 0.55)}px;
  fill: #fff;
}
#a11y-widget-btn.a11y-pulse {
  animation: a11yPulse 2s ease-in-out 3;
}
@keyframes a11yPulse {
  0%   { box-shadow: 0 4px 20px rgba(0,0,0,0.3), 0 0 0 0 ${CFG.color}60; }
  50%  { box-shadow: 0 4px 20px rgba(0,0,0,0.3), 0 0 0 12px ${CFG.color}00; }
  100% { box-shadow: 0 4px 20px rgba(0,0,0,0.3), 0 0 0 0 ${CFG.color}00; }
}

/* ============ Panel ============ */
#a11y-panel {
  position: fixed;
  ${vPos}: ${panelBottom};
  ${hPos}: ${btnOffset};
  width: 360px;
  max-height: calc(100vh - ${parseInt(panelBottom) + 20}px);
  background: #1a1a2e;
  border-radius: 16px;
  z-index: 999999;
  color: #e0e0e0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  box-shadow: 0 12px 48px rgba(0,0,0,0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  opacity: 0;
  transform: translateY(12px) scale(0.96);
  pointer-events: none;
  transition: opacity 0.25s ease, transform 0.25s ease;
}
#a11y-panel.a11y-open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* Panel header */
.a11y-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  background: #16213e;
  border-bottom: 1px solid #ffffff10;
  flex-shrink: 0;
}
.a11y-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}
.a11y-header h2 svg { width: 20px; height: 20px; fill: ${CFG.color}; }
.a11y-header-actions { display: flex; gap: 8px; align-items: center; }

.a11y-btn-reset, .a11y-btn-close {
  background: none;
  border: 1px solid #ffffff20;
  color: #aaa;
  padding: 5px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.15s;
  font-family: inherit;
}
.a11y-btn-reset:hover { background: #e74c3c; color: #fff; border-color: #e74c3c; }
.a11y-btn-close { padding: 5px 8px; font-size: 16px; line-height: 1; }
.a11y-btn-close:hover { background: #ffffff15; color: #fff; }

/* Scrollable body */
.a11y-body {
  overflow-y: auto;
  flex: 1;
  padding: 8px 0;
  scrollbar-width: thin;
  scrollbar-color: #ffffff20 transparent;
}
.a11y-body::-webkit-scrollbar { width: 6px; }
.a11y-body::-webkit-scrollbar-track { background: transparent; }
.a11y-body::-webkit-scrollbar-thumb { background: #ffffff25; border-radius: 3px; }

/* Sections */
.a11y-section {
  border-bottom: 1px solid #ffffff08;
}
.a11y-section:last-child { border-bottom: none; }
.a11y-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
  background: none;
  border: none;
  width: 100%;
  color: #e0e0e0;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: left;
}
.a11y-section-header:hover { background: #ffffff08; }
.a11y-section-header:focus-visible { outline: 2px solid ${CFG.color}; outline-offset: -2px; }
.a11y-section-chevron {
  transition: transform 0.2s;
  font-size: 10px;
  color: #666;
}
.a11y-section.open .a11y-section-chevron { transform: rotate(180deg); }
.a11y-section-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
  padding: 0 18px;
}
.a11y-section.open .a11y-section-content {
  max-height: 800px;
  padding: 4px 18px 14px;
}

/* Profile cards */
.a11y-profiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.a11y-profile-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 6px;
  border-radius: 10px;
  border: 1px solid #ffffff12;
  background: #ffffff06;
  color: #ccc;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  font-family: inherit;
  transition: all 0.15s;
  text-align: center;
  line-height: 1.3;
}
.a11y-profile-btn:hover { background: #ffffff12; color: #fff; }
.a11y-profile-btn:focus-visible { outline: 2px solid ${CFG.color}; outline-offset: -2px; }
.a11y-profile-btn.active {
  background: ${CFG.color}25;
  border-color: ${CFG.color};
  color: #fff;
}
.a11y-profile-btn .a11y-profile-icon { font-size: 22px; }

/* Controls row */
.a11y-control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}
.a11y-control + .a11y-control { border-top: 1px solid #ffffff06; }
.a11y-control-label { font-size: 13px; color: #ccc; flex: 1; }

/* Toggle switch */
.a11y-toggle {
  position: relative;
  width: 42px;
  height: 24px;
  flex-shrink: 0;
}
.a11y-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}
.a11y-toggle-slider {
  position: absolute;
  inset: 0;
  background: #333;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}
.a11y-toggle-slider::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}
.a11y-toggle input:checked + .a11y-toggle-slider { background: ${CFG.color}; }
.a11y-toggle input:checked + .a11y-toggle-slider::after { transform: translateX(18px); }
.a11y-toggle input:focus-visible + .a11y-toggle-slider { outline: 2px solid #fff; outline-offset: 2px; }

/* +/- stepper */
.a11y-stepper {
  display: flex;
  align-items: center;
  gap: 6px;
}
.a11y-stepper-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid #ffffff20;
  background: #ffffff08;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  font-family: inherit;
  padding: 0;
  line-height: 1;
}
.a11y-stepper-btn:hover { background: ${CFG.color}; border-color: ${CFG.color}; }
.a11y-stepper-btn:focus-visible { outline: 2px solid #fff; outline-offset: 1px; }
.a11y-stepper-val {
  min-width: 40px;
  text-align: center;
  font-size: 12px;
  color: #aaa;
  font-weight: 600;
}

/* Option group (pill buttons) */
.a11y-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 0;
}
.a11y-option-btn {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid #ffffff15;
  background: #ffffff06;
  color: #aaa;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.a11y-option-btn:hover { background: #ffffff15; color: #fff; }
.a11y-option-btn:focus-visible { outline: 2px solid ${CFG.color}; outline-offset: -1px; }
.a11y-option-btn.active { background: ${CFG.color}; border-color: ${CFG.color}; color: #fff; }

/* TTS controls */
.a11y-tts-controls {
  display: flex;
  gap: 6px;
  padding: 8px 0;
  flex-wrap: wrap;
}
.a11y-tts-btn {
  flex: 1;
  min-width: 70px;
  padding: 8px 6px;
  border-radius: 8px;
  border: 1px solid #ffffff15;
  background: #ffffff06;
  color: #ccc;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.a11y-tts-btn:hover { background: ${CFG.color}; border-color: ${CFG.color}; color: #fff; }
.a11y-tts-btn:focus-visible { outline: 2px solid #fff; outline-offset: 1px; }
.a11y-tts-btn.active { background: ${CFG.color}; border-color: ${CFG.color}; color: #fff; }

/* Speed slider */
.a11y-slider-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
}
.a11y-slider-row label { font-size: 12px; color: #888; white-space: nowrap; }
.a11y-slider-row input[type=range] {
  flex: 1;
  -webkit-appearance: none;
  height: 4px;
  background: #333;
  border-radius: 2px;
  outline: none;
}
.a11y-slider-row input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${CFG.color};
  cursor: pointer;
}
.a11y-slider-row input[type=range]:focus-visible { outline: 2px solid ${CFG.color}; outline-offset: 2px; }
.a11y-slider-val { font-size: 12px; color: #aaa; min-width: 30px; text-align: right; }

/* ============ Mobile ============ */
@media (max-width: 480px) {
  #a11y-panel {
    width: calc(100vw - 20px);
    ${hPos}: 10px;
    max-height: calc(100vh - ${parseInt(panelBottom) + 10}px);
    border-radius: 14px;
  }
}

/* ============ Reading Guide ============ */
#a11y-reading-guide-el {
  position: fixed;
  left: 0;
  width: 100%;
  height: 3px;
  background: ${CFG.color};
  opacity: 0.7;
  z-index: 999998;
  pointer-events: none;
  display: none;
  transition: top 0.05s linear;
}

/* ============ Reading Mask ============ */
#a11y-reading-mask-top,
#a11y-reading-mask-bottom {
  position: fixed;
  left: 0;
  width: 100%;
  background: rgba(0,0,0,0.75);
  z-index: 999998;
  pointer-events: none;
  display: none;
  transition: height 0.05s linear;
}
#a11y-reading-mask-top { top: 0; }
#a11y-reading-mask-bottom { bottom: 0; }

/* ============ TTS Highlight ============ */
.a11y-tts-highlight {
  background: ${CFG.color}40 !important;
  outline: 2px solid ${CFG.color} !important;
  outline-offset: 1px;
}

/* ============ Accessibility CSS Classes ============ */

/* Font size — applied via CSS variable */
html[style*="--a11y-font-size"] * {
  font-size: calc(var(--a11y-font-size) / 100 * 1em) !important;
}

/* Line height */
html.a11y-line-height-1 * { line-height: 1.8 !important; }
html.a11y-line-height-2 * { line-height: 2.2 !important; }
html.a11y-line-height-3 * { line-height: 2.6 !important; }
html.a11y-line-height-4 * { line-height: 3.0 !important; }

/* Letter spacing */
html.a11y-letter-spacing-1 * { letter-spacing: 1px !important; }
html.a11y-letter-spacing-2 * { letter-spacing: 2px !important; }
html.a11y-letter-spacing-3 * { letter-spacing: 3px !important; }
html.a11y-letter-spacing-4 * { letter-spacing: 4px !important; }

/* Word spacing */
html.a11y-word-spacing-1 * { word-spacing: 2px !important; }
html.a11y-word-spacing-2 * { word-spacing: 4px !important; }
html.a11y-word-spacing-3 * { word-spacing: 8px !important; }
html.a11y-word-spacing-4 * { word-spacing: 12px !important; }

/* Font family */
html.a11y-font-readable * { font-family: Arial, Helvetica, sans-serif !important; }
html.a11y-font-dyslexic * { font-family: 'OpenDyslexic', Arial, sans-serif !important; }

/* Text alignment */
html.a11y-text-left * { text-align: left !important; }
html.a11y-text-center * { text-align: center !important; }
html.a11y-text-right * { text-align: right !important; }

/* Contrast */
html.a11y-high-contrast { filter: contrast(1.5) !important; }
html.a11y-high-contrast * { border-color: #000 !important; }
html.a11y-dark-contrast { filter: invert(1) hue-rotate(180deg) !important; }
html.a11y-dark-contrast img,
html.a11y-dark-contrast video,
html.a11y-dark-contrast [style*="background-image"] { filter: invert(1) hue-rotate(180deg) !important; }
html.a11y-light-contrast { background: #fff !important; color: #000 !important; }
html.a11y-light-contrast * { background: #fff !important; color: #000 !important; border-color: #ccc !important; }
html.a11y-light-contrast img, html.a11y-light-contrast video { filter: none !important; background: transparent !important; }
html.a11y-monochrome { filter: grayscale(1) !important; }

/* Saturation */
html.a11y-low-saturation { filter: saturate(0.3) !important; }
html.a11y-high-saturation { filter: saturate(2) !important; }

/* Invert */
html.a11y-invert { filter: invert(1) hue-rotate(180deg) !important; }
html.a11y-invert img, html.a11y-invert video { filter: invert(1) hue-rotate(180deg) !important; }

/* Highlight links */
html.a11y-highlight-links a {
  text-decoration: underline !important;
  color: #ffeb3b !important;
  outline: 1px dashed #ffeb3b !important;
  outline-offset: 2px;
}

/* Highlight headings */
html.a11y-highlight-headings h1,
html.a11y-highlight-headings h2,
html.a11y-highlight-headings h3,
html.a11y-highlight-headings h4,
html.a11y-highlight-headings h5,
html.a11y-highlight-headings h6 {
  outline: 2px solid #ff9800 !important;
  outline-offset: 4px;
  padding: 2px 4px !important;
}

/* Big cursor */
html.a11y-big-cursor,
html.a11y-big-cursor * {
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Cpath d='M4 4l16 40 6-16 16-6z' fill='%23000' stroke='%23fff' stroke-width='2'/%3E%3C/svg%3E") 4 4, auto !important;
}

/* Focus indicator */
html.a11y-focus-indicator *:focus {
  outline: 4px solid ${CFG.color} !important;
  outline-offset: 3px !important;
}

/* Hide images */
html.a11y-hide-images img,
html.a11y-hide-images svg:not(#a11y-widget-btn svg):not(.a11y-profile-icon),
html.a11y-hide-images [role="img"],
html.a11y-hide-images picture {
  opacity: 0.05 !important;
}

/* Stop animations */
html.a11y-stop-animations *,
html.a11y-stop-animations *::before,
html.a11y-stop-animations *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}
html.a11y-stop-animations #a11y-widget-btn,
html.a11y-stop-animations #a11y-panel,
html.a11y-stop-animations #a11y-panel *,
html.a11y-stop-animations .a11y-toggle-slider,
html.a11y-stop-animations .a11y-toggle-slider::after,
html.a11y-stop-animations .a11y-section-chevron,
html.a11y-stop-animations .a11y-section-content {
  transition-duration: 0.2s !important;
}

/* ============ Exclude widget from page-level filters ============ */
html.a11y-dark-contrast #a11y-widget-btn,
html.a11y-dark-contrast #a11y-panel,
html.a11y-invert #a11y-widget-btn,
html.a11y-invert #a11y-panel,
html.a11y-light-contrast #a11y-widget-btn,
html.a11y-light-contrast #a11y-panel {
  filter: invert(1) hue-rotate(180deg) !important;
}
html.a11y-light-contrast #a11y-panel,
html.a11y-light-contrast #a11y-panel * {
  background: revert !important;
  color: revert !important;
  border-color: revert !important;
}
html.a11y-monochrome #a11y-widget-btn,
html.a11y-monochrome #a11y-panel,
html.a11y-low-saturation #a11y-widget-btn,
html.a11y-low-saturation #a11y-panel,
html.a11y-high-saturation #a11y-widget-btn,
html.a11y-high-saturation #a11y-panel,
html.a11y-high-contrast #a11y-widget-btn,
html.a11y-high-contrast #a11y-panel {
  filter: none !important;
}
`;
    var style = document.createElement('style');
    style.id = 'a11y-widget-styles';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  /* ------------------------------------------------------------------ */
  /*  SVG Icons                                                          */
  /* ------------------------------------------------------------------ */
  var ICON_A11Y = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="4" r="2"/><path d="M19 13v-2c-1.54.02-3.09-.75-4.07-1.83l-1.29-1.43c-.17-.19-.38-.34-.61-.45-.01 0-.01-.01-.02-.01H13c-.35-.2-.75-.3-1.19-.26C10.76 7.11 10 8.04 10 9.09V15c0 1.1.9 2 2 2h5v5h2v-5.5c0-1.1-.9-2-2-2h-3v-3.45c1.29 1.07 3.25 1.94 5 1.95zm-6.17 5c-.41 1.16-1.52 2-2.83 2-1.66 0-3-1.34-3-3 0-1.31.84-2.41 2-2.83V12.1c-2.28.46-4 2.48-4 4.9 0 2.76 2.24 5 5 5 2.42 0 4.44-1.72 4.9-4h-2.07z"/></svg>';

  /* ------------------------------------------------------------------ */
  /*  Build DOM                                                          */
  /* ------------------------------------------------------------------ */
  function buildWidget() {
    // Floating button
    var btn = document.createElement('button');
    btn.id = 'a11y-widget-btn';
    btn.setAttribute('aria-label', 'Open accessibility menu');
    btn.setAttribute('title', 'Accessibility');
    btn.innerHTML = ICON_A11Y;
    btn.classList.add('a11y-pulse');
    btn.addEventListener('click', togglePanel);

    // Panel
    var panel = document.createElement('div');
    panel.id = 'a11y-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Accessibility settings');
    panel.innerHTML = buildPanelHTML();

    // Reading guide element
    var guide = document.createElement('div');
    guide.id = 'a11y-reading-guide-el';

    // Reading mask elements
    var maskTop = document.createElement('div');
    maskTop.id = 'a11y-reading-mask-top';
    var maskBot = document.createElement('div');
    maskBot.id = 'a11y-reading-mask-bottom';

    document.body.appendChild(guide);
    document.body.appendChild(maskTop);
    document.body.appendChild(maskBot);
    document.body.appendChild(btn);
    document.body.appendChild(panel);

    bindEvents(panel);
    bindMouseTracking();

    // Keyboard: Escape to close
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panelOpen) togglePanel();
    });
  }

  function buildPanelHTML() {
    return `
      <div class="a11y-header">
        <h2>${ICON_A11Y} Accessibility</h2>
        <div class="a11y-header-actions">
          <button class="a11y-btn-reset" data-action="reset" aria-label="Reset all settings">Reset All</button>
          <button class="a11y-btn-close" data-action="close" aria-label="Close accessibility panel">&times;</button>
        </div>
      </div>
      <div class="a11y-body">
        ${buildSection('Accessibility Profiles', buildProfiles(), true)}
        ${buildSection('Text Adjustments', buildTextAdjustments())}
        ${buildSection('Color & Display', buildColorDisplay())}
        ${buildSection('Navigation & Cursor', buildNavCursor())}
        ${buildSection('Text-to-Speech', buildTTS())}
      </div>
    `;
  }

  function buildSection(title, content, openDefault) {
    return `<div class="a11y-section${openDefault ? ' open' : ''}">
      <button class="a11y-section-header" aria-expanded="${openDefault ? 'true' : 'false'}">
        <span>${title}</span>
        <span class="a11y-section-chevron">▼</span>
      </button>
      <div class="a11y-section-content">${content}</div>
    </div>`;
  }

  function buildProfiles() {
    var profiles = [
      { id: 'seizure-safe', icon: '⚡', label: 'Seizure Safe' },
      { id: 'vision-impaired', icon: '👁', label: 'Vision Impaired' },
      { id: 'adhd-friendly', icon: '🎯', label: 'ADHD Friendly' },
      { id: 'cognitive', icon: '🧠', label: 'Cognitive Disability' },
      { id: 'blind', icon: '🦮', label: 'Blind Users' },
    ];
    var html = '<div class="a11y-profiles">';
    profiles.forEach(function (p) {
      var active = state.activeProfile === p.id ? ' active' : '';
      html += '<button class="a11y-profile-btn' + active + '" data-profile="' + p.id + '" aria-pressed="' + (active ? 'true' : 'false') + '">' +
        '<span class="a11y-profile-icon">' + p.icon + '</span>' + p.label + '</button>';
    });
    html += '</div>';
    return html;
  }

  function buildTextAdjustments() {
    return `
      ${buildStepper('Font Size', 'fontSize', state.fontSize + '%')}
      ${buildStepper('Line Height', 'lineHeight', state.lineHeight === 0 ? 'Default' : '+' + state.lineHeight)}
      ${buildStepper('Letter Spacing', 'letterSpacing', state.letterSpacing === 0 ? 'Default' : '+' + state.letterSpacing)}
      ${buildStepper('Word Spacing', 'wordSpacing', state.wordSpacing === 0 ? 'Default' : '+' + state.wordSpacing)}
      <div class="a11y-control">
        <span class="a11y-control-label">Font Family</span>
      </div>
      <div class="a11y-options">
        <button class="a11y-option-btn${state.fontFamily === 'default' ? ' active' : ''}" data-option="fontFamily" data-val="default">Default</button>
        <button class="a11y-option-btn${state.fontFamily === 'readable' ? ' active' : ''}" data-option="fontFamily" data-val="readable">Readable</button>
        <button class="a11y-option-btn${state.fontFamily === 'dyslexic' ? ' active' : ''}" data-option="fontFamily" data-val="dyslexic">Dyslexia</button>
      </div>
      <div class="a11y-control">
        <span class="a11y-control-label">Text Alignment</span>
      </div>
      <div class="a11y-options">
        <button class="a11y-option-btn${state.textAlign === 'default' ? ' active' : ''}" data-option="textAlign" data-val="default">Default</button>
        <button class="a11y-option-btn${state.textAlign === 'left' ? ' active' : ''}" data-option="textAlign" data-val="left">Left</button>
        <button class="a11y-option-btn${state.textAlign === 'center' ? ' active' : ''}" data-option="textAlign" data-val="center">Center</button>
        <button class="a11y-option-btn${state.textAlign === 'right' ? ' active' : ''}" data-option="textAlign" data-val="right">Right</button>
      </div>
    `;
  }

  function buildStepper(label, key, valDisplay) {
    return `<div class="a11y-control">
      <span class="a11y-control-label">${label}</span>
      <div class="a11y-stepper">
        <button class="a11y-stepper-btn" data-step="${key}" data-dir="-1" aria-label="Decrease ${label}">−</button>
        <span class="a11y-stepper-val" data-stepper-val="${key}">${valDisplay}</span>
        <button class="a11y-stepper-btn" data-step="${key}" data-dir="1" aria-label="Increase ${label}">+</button>
      </div>
    </div>`;
  }

  function buildColorDisplay() {
    return `
      <div class="a11y-control"><span class="a11y-control-label">Contrast</span></div>
      <div class="a11y-options">
        <button class="a11y-option-btn${state.contrast === 'default' ? ' active' : ''}" data-option="contrast" data-val="default">Default</button>
        <button class="a11y-option-btn${state.contrast === 'high' ? ' active' : ''}" data-option="contrast" data-val="high">High</button>
        <button class="a11y-option-btn${state.contrast === 'dark' ? ' active' : ''}" data-option="contrast" data-val="dark">Dark</button>
        <button class="a11y-option-btn${state.contrast === 'light' ? ' active' : ''}" data-option="contrast" data-val="light">Light</button>
        <button class="a11y-option-btn${state.contrast === 'monochrome' ? ' active' : ''}" data-option="contrast" data-val="monochrome">Mono</button>
      </div>
      <div class="a11y-control"><span class="a11y-control-label">Saturation</span></div>
      <div class="a11y-options">
        <button class="a11y-option-btn${state.saturation === 'default' ? ' active' : ''}" data-option="saturation" data-val="default">Default</button>
        <button class="a11y-option-btn${state.saturation === 'low' ? ' active' : ''}" data-option="saturation" data-val="low">Low</button>
        <button class="a11y-option-btn${state.saturation === 'high' ? ' active' : ''}" data-option="saturation" data-val="high">High</button>
      </div>
      ${buildToggle('Invert Colors', 'invertColors')}
      ${buildToggle('Highlight Links', 'highlightLinks')}
      ${buildToggle('Highlight Headings', 'highlightHeadings')}
    `;
  }

  function buildNavCursor() {
    return `
      ${buildToggle('Big Cursor', 'bigCursor')}
      ${buildToggle('Reading Guide', 'readingGuide')}
      ${buildToggle('Focus Indicator', 'focusIndicator')}
      ${buildToggle('Hide Images', 'hideImages')}
      ${buildToggle('Stop Animations', 'stopAnimations')}
      ${buildToggle('Reading Mask', 'readingMask')}
    `;
  }

  function buildTTS() {
    return `
      <div class="a11y-tts-controls">
        <button class="a11y-tts-btn" data-tts="play">▶ Read Page</button>
        <button class="a11y-tts-btn" data-tts="pause">⏸ Pause</button>
        <button class="a11y-tts-btn" data-tts="stop">⏹ Stop</button>
      </div>
      <div class="a11y-slider-row">
        <label>Speed</label>
        <input type="range" min="0.5" max="3" step="0.25" value="${state.ttsSpeed}" data-tts-speed>
        <span class="a11y-slider-val" data-tts-speed-val>${state.ttsSpeed}x</span>
      </div>
    `;
  }

  function buildToggle(label, key) {
    var checked = state[key] ? ' checked' : '';
    return `<div class="a11y-control">
      <span class="a11y-control-label">${label}</span>
      <label class="a11y-toggle">
        <input type="checkbox" data-toggle="${key}"${checked}>
        <span class="a11y-toggle-slider"></span>
      </label>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Event Binding                                                      */
  /* ------------------------------------------------------------------ */
  function bindEvents(panel) {
    // Close / Reset
    panel.addEventListener('click', function (e) {
      var target = e.target;
      // Close button
      if (target.dataset.action === 'close' || target.closest('[data-action="close"]')) {
        togglePanel();
        return;
      }
      // Reset
      if (target.dataset.action === 'reset' || target.closest('[data-action="reset"]')) {
        resetAll();
        return;
      }
      // Section toggle
      var header = target.closest('.a11y-section-header');
      if (header) {
        var section = header.parentElement;
        var isOpen = section.classList.toggle('open');
        header.setAttribute('aria-expanded', isOpen);
        return;
      }
      // Profile
      var profileBtn = target.closest('[data-profile]');
      if (profileBtn) {
        activateProfile(profileBtn.dataset.profile);
        return;
      }
      // Stepper
      var stepBtn = target.closest('[data-step]');
      if (stepBtn) {
        handleStep(stepBtn.dataset.step, parseInt(stepBtn.dataset.dir));
        return;
      }
      // Option buttons
      var optBtn = target.closest('[data-option]');
      if (optBtn) {
        handleOption(optBtn.dataset.option, optBtn.dataset.val);
        return;
      }
      // TTS
      var ttsBtn = target.closest('[data-tts]');
      if (ttsBtn) {
        handleTTS(ttsBtn.dataset.tts);
        return;
      }
    });

    // Toggles
    panel.addEventListener('change', function (e) {
      if (e.target.dataset.toggle) {
        state[e.target.dataset.toggle] = e.target.checked;
        state.activeProfile = null;
        applyAll();
        savePrefs();
      }
      if (e.target.hasAttribute('data-tts-speed')) {
        state.ttsSpeed = parseFloat(e.target.value);
        var valEl = panel.querySelector('[data-tts-speed-val]');
        if (valEl) valEl.textContent = state.ttsSpeed + 'x';
        savePrefs();
      }
    });
    // Also handle input event for live slider update
    panel.addEventListener('input', function (e) {
      if (e.target.hasAttribute('data-tts-speed')) {
        state.ttsSpeed = parseFloat(e.target.value);
        var valEl = panel.querySelector('[data-tts-speed-val]');
        if (valEl) valEl.textContent = state.ttsSpeed + 'x';
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Panel Toggle                                                       */
  /* ------------------------------------------------------------------ */
  function togglePanel() {
    var panel = document.getElementById('a11y-panel');
    var btn = document.getElementById('a11y-widget-btn');
    panelOpen = !panelOpen;
    panel.classList.toggle('a11y-open', panelOpen);
    btn.setAttribute('aria-expanded', panelOpen);
    btn.classList.remove('a11y-pulse');
    if (panelOpen) {
      // Focus first focusable element
      setTimeout(function () {
        var firstBtn = panel.querySelector('button, input');
        if (firstBtn) firstBtn.focus();
      }, 100);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Profiles                                                           */
  /* ------------------------------------------------------------------ */
  function activateProfile(id) {
    // If same profile, deactivate
    if (state.activeProfile === id) {
      resetAll();
      return;
    }
    // Reset first
    for (var k in defaults) state[k] = defaults[k];

    state.activeProfile = id;

    switch (id) {
      case 'seizure-safe':
        state.stopAnimations = true;
        state.saturation = 'low';
        break;
      case 'vision-impaired':
        state.fontSize = 150;
        state.contrast = 'high';
        state.focusIndicator = true;
        state.highlightLinks = true;
        break;
      case 'adhd-friendly':
        state.readingMask = true;
        state.saturation = 'low';
        state.stopAnimations = true;
        break;
      case 'cognitive':
        state.fontSize = 140;
        state.lineHeight = 2;
        state.readingGuide = true;
        state.fontFamily = 'readable';
        state.highlightLinks = true;
        break;
      case 'blind':
        state.focusIndicator = true;
        state.fontSize = 130;
        state.fontFamily = 'readable';
        state.highlightLinks = true;
        state.highlightHeadings = true;
        // Add ARIA enhancements
        enhanceARIA();
        break;
    }

    applyAll();
    savePrefs();
    refreshPanel();
  }

  function enhanceARIA() {
    // Add landmark roles if missing
    var main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (!main) {
      var content = document.querySelector('#content, #main-content, .main-content, article');
      if (content && !content.getAttribute('role')) content.setAttribute('role', 'main');
    }
    // Make images with alt text more discoverable
    document.querySelectorAll('img[alt]').forEach(function (img) {
      if (!img.getAttribute('role')) img.setAttribute('role', 'img');
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Handlers                                                           */
  /* ------------------------------------------------------------------ */
  function handleStep(key, dir) {
    state.activeProfile = null;
    switch (key) {
      case 'fontSize':
        state.fontSize = clamp(state.fontSize + dir * 10, 80, 200);
        break;
      case 'lineHeight':
        state.lineHeight = clamp(state.lineHeight + dir, 0, 4);
        break;
      case 'letterSpacing':
        state.letterSpacing = clamp(state.letterSpacing + dir, 0, 4);
        break;
      case 'wordSpacing':
        state.wordSpacing = clamp(state.wordSpacing + dir, 0, 4);
        break;
    }
    applyAll();
    savePrefs();
    updateStepperDisplay(key);
  }

  function handleOption(key, val) {
    state[key] = val;
    state.activeProfile = null;
    applyAll();
    savePrefs();
    // Update active state in UI
    var panel = document.getElementById('a11y-panel');
    panel.querySelectorAll('[data-option="' + key + '"]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.val === val);
    });
  }

  function handleTTS(action) {
    if (!window.speechSynthesis) return;

    if (action === 'play') {
      if (ttsPaused) {
        speechSynthesis.resume();
        ttsPaused = false;
        return;
      }
      speechSynthesis.cancel();
      var text = getPageText();
      ttsUtterance = new SpeechSynthesisUtterance(text);
      ttsUtterance.rate = state.ttsSpeed;
      ttsUtterance.onend = function () { ttsActive = false; clearTTSHighlight(); };
      ttsUtterance.onboundary = function (e) {
        if (e.name === 'word') highlightTTSWord(text, e.charIndex, e.charLength);
      };
      ttsActive = true;
      ttsPaused = false;
      speechSynthesis.speak(ttsUtterance);
    } else if (action === 'pause') {
      if (ttsActive && !ttsPaused) {
        speechSynthesis.pause();
        ttsPaused = true;
      }
    } else if (action === 'stop') {
      speechSynthesis.cancel();
      ttsActive = false;
      ttsPaused = false;
      clearTTSHighlight();
    }
  }

  function getPageText() {
    var sel = 'main, [role="main"], article, .main-content, #content, #main-content';
    var container = document.querySelector(sel) || document.body;
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        var tag = p.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return NodeFilter.FILTER_REJECT;
        if (p.closest('#a11y-panel, #a11y-widget-btn')) return NodeFilter.FILTER_REJECT;
        if (p.offsetParent === null && p.tagName !== 'BODY') return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var text = '';
    while (walker.nextNode()) {
      var t = walker.currentNode.textContent.trim();
      if (t) text += t + ' ';
    }
    return text.trim();
  }

  var ttsHighlighted = null;
  function highlightTTSWord(fullText, charIndex, charLength) {
    clearTTSHighlight();
    if (!charLength) return;
    var word = fullText.substr(charIndex, charLength || 10);
    // Try to find this word on the page (best effort)
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      var node = walker.currentNode;
      if (node.parentElement.closest('#a11y-panel, #a11y-widget-btn')) continue;
      if (node.textContent.includes(word)) {
        var parent = node.parentElement;
        if (parent) {
          parent.classList.add('a11y-tts-highlight');
          ttsHighlighted = parent;
          parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      }
    }
  }

  function clearTTSHighlight() {
    if (ttsHighlighted) {
      ttsHighlighted.classList.remove('a11y-tts-highlight');
      ttsHighlighted = null;
    }
    document.querySelectorAll('.a11y-tts-highlight').forEach(function (el) {
      el.classList.remove('a11y-tts-highlight');
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Apply Settings to DOM                                              */
  /* ------------------------------------------------------------------ */
  function applyAll() {
    // Clear all a11y classes
    var classes = root.className.split(/\s+/).filter(function (c) { return c.startsWith(PREFIX); });
    classes.forEach(function (c) { root.classList.remove(c); });

    // Font size via CSS variable
    if (state.fontSize !== 100) {
      root.style.setProperty('--a11y-font-size', state.fontSize);
    } else {
      root.style.removeProperty('--a11y-font-size');
    }

    // Stepped values
    if (state.lineHeight > 0) root.classList.add(PREFIX + 'line-height-' + state.lineHeight);
    if (state.letterSpacing > 0) root.classList.add(PREFIX + 'letter-spacing-' + state.letterSpacing);
    if (state.wordSpacing > 0) root.classList.add(PREFIX + 'word-spacing-' + state.wordSpacing);

    // Font family
    if (state.fontFamily === 'readable') root.classList.add(PREFIX + 'font-readable');
    if (state.fontFamily === 'dyslexic') root.classList.add(PREFIX + 'font-dyslexic');

    // Text align
    if (state.textAlign !== 'default') root.classList.add(PREFIX + 'text-' + state.textAlign);

    // Contrast
    var contrastMap = { high: 'high-contrast', dark: 'dark-contrast', light: 'light-contrast', monochrome: 'monochrome' };
    if (contrastMap[state.contrast]) root.classList.add(PREFIX + contrastMap[state.contrast]);

    // Saturation
    if (state.saturation === 'low') root.classList.add(PREFIX + 'low-saturation');
    if (state.saturation === 'high') root.classList.add(PREFIX + 'high-saturation');

    // Toggles
    if (state.invertColors) root.classList.add(PREFIX + 'invert');
    if (state.highlightLinks) root.classList.add(PREFIX + 'highlight-links');
    if (state.highlightHeadings) root.classList.add(PREFIX + 'highlight-headings');
    if (state.bigCursor) root.classList.add(PREFIX + 'big-cursor');
    if (state.focusIndicator) root.classList.add(PREFIX + 'focus-indicator');
    if (state.hideImages) root.classList.add(PREFIX + 'hide-images');
    if (state.stopAnimations) root.classList.add(PREFIX + 'stop-animations');

    // Reading guide
    var guideEl = document.getElementById('a11y-reading-guide-el');
    if (guideEl) guideEl.style.display = state.readingGuide ? 'block' : 'none';

    // Reading mask
    var maskTop = document.getElementById('a11y-reading-mask-top');
    var maskBot = document.getElementById('a11y-reading-mask-bottom');
    if (maskTop) maskTop.style.display = state.readingMask ? 'block' : 'none';
    if (maskBot) maskBot.style.display = state.readingMask ? 'block' : 'none';
  }

  /* ------------------------------------------------------------------ */
  /*  Mouse Tracking (reading guide + mask)                              */
  /* ------------------------------------------------------------------ */
  function bindMouseTracking() {
    document.addEventListener('mousemove', function (e) {
      if (state.readingGuide) {
        var guide = document.getElementById('a11y-reading-guide-el');
        if (guide) guide.style.top = e.clientY + 'px';
      }
      if (state.readingMask) {
        var maskTop = document.getElementById('a11y-reading-mask-top');
        var maskBot = document.getElementById('a11y-reading-mask-bottom');
        var maskHeight = 80;
        if (maskTop) maskTop.style.height = Math.max(0, e.clientY - maskHeight) + 'px';
        if (maskBot) maskBot.style.height = Math.max(0, window.innerHeight - e.clientY - maskHeight) + 'px';
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Reset                                                              */
  /* ------------------------------------------------------------------ */
  function resetAll() {
    // Stop TTS
    if (window.speechSynthesis) speechSynthesis.cancel();
    ttsActive = false;
    ttsPaused = false;
    clearTTSHighlight();

    for (var k in defaults) state[k] = defaults[k];
    applyAll();
    savePrefs();
    refreshPanel();
  }

  /* ------------------------------------------------------------------ */
  /*  UI Refresh                                                         */
  /* ------------------------------------------------------------------ */
  function refreshPanel() {
    var panel = document.getElementById('a11y-panel');
    if (!panel) return;
    // Remember which sections are open
    var openSections = [];
    panel.querySelectorAll('.a11y-section').forEach(function (s, i) {
      if (s.classList.contains('open')) openSections.push(i);
    });
    panel.innerHTML = buildPanelHTML();
    // Restore open sections
    panel.querySelectorAll('.a11y-section').forEach(function (s, i) {
      if (openSections.indexOf(i) !== -1) {
        s.classList.add('open');
        s.querySelector('.a11y-section-header').setAttribute('aria-expanded', 'true');
      }
    });
    bindEvents(panel);
    if (panelOpen) panel.classList.add('a11y-open');
  }

  function updateStepperDisplay(key) {
    var panel = document.getElementById('a11y-panel');
    if (!panel) return;
    var el = panel.querySelector('[data-stepper-val="' + key + '"]');
    if (!el) return;
    switch (key) {
      case 'fontSize': el.textContent = state.fontSize + '%'; break;
      case 'lineHeight': el.textContent = state.lineHeight === 0 ? 'Default' : '+' + state.lineHeight; break;
      case 'letterSpacing': el.textContent = state.letterSpacing === 0 ? 'Default' : '+' + state.letterSpacing; break;
      case 'wordSpacing': el.textContent = state.wordSpacing === 0 ? 'Default' : '+' + state.wordSpacing; break;
    }
    // Update profile buttons
    panel.querySelectorAll('[data-profile]').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.profile === state.activeProfile);
      btn.setAttribute('aria-pressed', btn.dataset.profile === state.activeProfile);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Utilities                                                          */
  /* ------------------------------------------------------------------ */
  function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
  }

  /* ------------------------------------------------------------------ */
  /*  Init                                                               */
  /* ------------------------------------------------------------------ */
  function init() {
    injectStyles();
    // Apply saved preferences immediately (before DOM is fully ready for classes)
    applyAll();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildWidget);
    } else {
      buildWidget();
    }
  }

  init();
})();
