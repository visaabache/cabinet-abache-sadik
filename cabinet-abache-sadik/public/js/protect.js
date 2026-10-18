/* Content protection — deters copying and casual source inspection.
   Every visitor can read every page: there is deliberately NO DevTools
   detector, because on phones it can't tell DevTools from the browser's own
   toolbars and it locked real visitors out.
   To turn protection off, delete the <script src="js/protect.js"> line from each page. */
(function () {
  'use strict';

  /* No text selection, no iPhone long-press copy/save menu, no printing.
     Form fields stay usable so visitors can still fill in the contact form. */
  var style = document.createElement('style');
  style.textContent =
    'body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}' +
    'img,a{-webkit-touch-callout:none;-webkit-user-drag:none}' +
    'input,textarea,select{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}' +
    '@media print{body{display:none!important}}';
  document.head.appendChild(style);

  var inField = function (e) {
    return e.target && e.target.closest && e.target.closest('input, textarea, select');
  };

  /* Right-click / long-press menu, dragging, copy and cut */
  document.addEventListener('contextmenu', function (e) { if (!inField(e)) e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { e.preventDefault(); });
  document.addEventListener('copy', function (e) { if (!inField(e)) e.preventDefault(); });
  document.addEventListener('cut', function (e) { if (!inField(e)) e.preventDefault(); });
  document.addEventListener('selectstart', function (e) { if (!inField(e)) e.preventDefault(); });

  /* Keyboard shortcuts for DevTools, view source, save, print, copy, select all */
  document.addEventListener('keydown', function (e) {
    // e.code is layout-independent (Option on Mac and Arabic/French keyboards change e.key)
    var k = (e.code || '').replace('Key', '').toLowerCase();
    var mod = e.ctrlKey || e.metaKey;
    if (e.key === 'F12') { e.preventDefault(); return; }
    // Ctrl+Shift+I/J/C/K/U (Windows, Linux) and Cmd+Option+I/J/C/U (Mac)
    if (mod && (e.shiftKey || e.altKey) && ['i', 'j', 'c', 'k', 'u'].indexOf(k) !== -1) { e.preventDefault(); return; }
    if (mod && ['u', 's', 'p'].indexOf(k) !== -1) { e.preventDefault(); return; }
    if (mod && ['c', 'x', 'a'].indexOf(k) !== -1 && !inField(e)) e.preventDefault();
  }, true);
})();
