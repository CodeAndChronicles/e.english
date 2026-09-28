/* icons.js — Small self-contained line-icon set (original artwork, not a
   third-party library) so the app never depends on a CDN to render its UI.
   24x24 viewBox, stroke=currentColor, matches the previous Iconify/Lucide
   visual language closely enough that no other file needs to change its
   icon *names* — only how they're resolved to markup.
   Usage: Icons.svg('home') -> SVGElement (use Icons.el(...) from ui.js). */
(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  // Each entry is the *inner* markup of a 24x24 stroke icon.
  const PATHS = {
    home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/>',
    'bar-chart-2': '<path d="M6 20V11"/><path d="M12 20V4"/><path d="M18 20v-7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.13-1.34l2-1.57-2-3.46-2.37.96a7 7 0 0 0-2.32-1.34L14 3h-4l-.18 2.25a7 7 0 0 0-2.32 1.34l-2.37-.96-2 3.46 2 1.57A7 7 0 0 0 5 12c0 .46.05.9.13 1.34l-2 1.57 2 3.46 2.37-.96c.68.57 1.47 1.02 2.32 1.34L10 21h4l.18-2.25c.85-.32 1.64-.77 2.32-1.34l2.37.96 2-3.46-2-1.57c.08-.44.13-.88.13-1.34Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
    'chevron-left': '<path d="M15 6l-6 6 6 6"/>',
    'chevron-right': '<path d="M9 6l6 6-6 6"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/>',
    'book-open': '<path d="M12 6.5C10.5 5 8 4 4 4v14c4 0 6.5 1 8 2.5C13.5 19 16 18 20 18V4c-4 0-6.5 1-8 2.5Z"/><path d="M12 6.5V21"/>',
    quote: '<path d="M7 8c-2 1-3 2.5-3 4.5S5.5 16 8 16"/><path d="M7 8v4.5"/><path d="M16 8c-2 1-3 2.5-3 4.5s1.5 3.5 4 3.5"/><path d="M16 8v4.5"/>',
    repeat: '<path d="m4 9 3-3 3 3"/><path d="M7 6v7a3 3 0 0 0 3 3h9"/><path d="m20 15-3 3-3-3"/><path d="M17 18v-7a3 3 0 0 0-3-3H5"/>',
    'git-branch': '<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="8" r="2"/><path d="M6 7v10"/><path d="M6 15c0-4 4-5 8-5.5"/><path d="M18 10v3.5"/>',
    'file-text': '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M9.5 13h5"/><path d="M9.5 16.5h5"/>',
    'alert-triangle': '<path d="M12 4 2.5 20h19L12 4Z"/><path d="M12 10.5v4"/><circle cx="12" cy="17.3" r="0.6" fill="currentColor" stroke="none"/>',
    'check-circle': '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.3 2.4 2.4 4.6-5.4"/>',
    check: '<path d="M4.5 12.5 9 17l10.5-11"/>',
    x: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
    'x-circle': '<circle cx="12" cy="12" r="8.5"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/>',
    minus: '<path d="M5 12h14"/>',
    'minus-circle': '<circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/>',
    'plus-circle': '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8"/><path d="M8 12h8"/>',
    flag: '<path d="M6 3v18"/><path d="M6 4h11l-2.5 4L17 12H6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    history: '<path d="M4 12a8 8 0 1 0 2.5-5.8"/><path d="M4 4v4.5H8.5"/><path d="M12 7.5V12l3 2"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.7-4.4 4.1 1.2 5.9L12 16.7 6.7 19.6l1.2-5.9-4.4-4.1 5.9-.7L12 3.5Z"/>',
    'pencil-line': '<path d="M4 20.5h4L18.5 10a2.1 2.1 0 0 0-3-3L5 17.5v3Z"/><path d="M14 5.5l4.5 4.5"/>',
    'skip-forward': '<path d="M6 5v14l10-7L6 5Z"/><path d="M18 5v14"/>',
    palette: '<circle cx="12" cy="12" r="9"/><circle cx="8.3" cy="10.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="8" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.7" cy="10.5" r="1.1" fill="currentColor" stroke="none"/><path d="M12 21a2 2 0 0 1-2-2c0-1 1-1.3 1-2.3a1.7 1.7 0 0 0-1.7-1.7H8a3 3 0 0 1-3-3 8.5 8.5 0 1 1 8.9 8.9c-.6.1-1.2.1-1.9.1Z"/>',
    'swatch-book': '<rect x="3" y="4" width="6" height="16" rx="1.5"/><path d="M11 5.5 15.5 4l3 14-4.5 1.5"/>',
    'sun-moon': '<path d="M12 3v2"/><path d="M5 10a7 7 0 0 1 7-7"/><circle cx="12" cy="15" r="5"/><path d="M12 20v1"/><path d="M7 15H6"/><path d="M18 15h-1"/>',
    sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
    'battery-charging': '<rect x="2.5" y="7" width="16" height="10" rx="2"/><path d="M21.5 10v4"/><path d="M11.5 9 9 13h3l-2.5 4"/>',
    database: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    download: '<path d="M12 4v11.5"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/><path d="M4.5 19.5h15"/>',
    upload: '<path d="M12 19.5V8"/><path d="m7.5 12.5 4.5-4.5 4.5 4.5"/><path d="M4.5 19.5h15"/>',
    'trash-2': '<path d="M4.5 6.5h15"/><path d="M9 6.5V4.8c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3v1.7"/><path d="M6.5 6.5 7.3 20a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-13.5"/><path d="M10.2 10.5v7"/><path d="M13.8 10.5v7"/>',
    list: '<path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>',
    'server-off': '<path d="M3 3l18 18"/><rect x="2.5" y="4" width="19" height="7" rx="1.5"/><path d="M2.5 15h9"/><path d="M17.5 15h4"/><path d="M6 7.5h.01"/>',
    cpu: '<rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/><rect x="10" y="10" width="4" height="4"/><path d="M9 2.5v3M15 2.5v3M9 18.5v3M15 18.5v3M2.5 9h3M2.5 15h3M18.5 9h3M18.5 15h3"/>',
    smartphone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2"/><path d="M11 19h2"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none"/>',
    'refresh-cw': '<path d="M20 8a8 8 0 0 0-14.5-3.5L3 7"/><path d="M3 3v4.5h4.5"/><path d="M4 16a8 8 0 0 0 14.5 3.5L21 17"/><path d="M21 21v-4.5h-4.5"/>',
    menu: '<path d="M4 6.5h16"/><path d="M4 12h16"/><path d="M4 17.5h16"/>',
    'wifi-off': '<path d="M3 3l18 18"/><path d="M5.5 9a13 13 0 0 1 3.4-2.1"/><path d="M12 5c3 0 5.8.9 8 2.6"/><path d="M8.8 13a7 7 0 0 1 4-1.5"/><path d="M12 17.5v.01"/>'
  };

  function svg(name, extraClass) {
    const key = String(name || '').replace(/^lucide:/, '');
    const inner = PATHS[key] || PATHS['file-text'];
    const el = document.createElementNS(NS, 'svg');
    el.setAttribute('viewBox', '0 0 24 24');
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', 'currentColor');
    el.setAttribute('stroke-width', '2');
    el.setAttribute('stroke-linecap', 'round');
    el.setAttribute('stroke-linejoin', 'round');
    el.setAttribute('aria-hidden', 'true');
    el.classList.add('icon');
    if (extraClass) extraClass.split(' ').forEach(function (c) { if (c) el.classList.add(c); });
    el.innerHTML = inner;
    return el;
  }

  global.Icons = { svg: svg, has: function (name) { return !!PATHS[String(name || '').replace(/^lucide:/, '')]; } };
})(window);
