/* settings.js — Presentation layer for the Settings screen ONLY.
   Same rules as ui.js: no direct localStorage, everything goes through
   window.UX. Loaded after ui.js and attaches UI.renderSettings onto the
   same global UI object (order-independent — ui.js's nav handler looks
   this property up at click time, not at load time). */
(function (global) {
  'use strict';

  /* ---------------- tiny local DOM helpers (mirrors ui.js's h/icon) ---------------- */
  function h(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null) return;
        if (typeof c === 'string') node.appendChild(document.createTextNode(c));
        else node.appendChild(c);
      });
    }
    return node;
  }
  function icon(name, extraClass) {
    return Icons.svg(name, extraClass);
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  // 8 accent palettes in two groups of four (see CSS/root.css).
  const COLOR_LABELS = { midnight: 'Midnight', plum: 'Plum', petrol: 'Petrol', umber: 'Umber', sky: 'Sky', lavender: 'Lavender', rose: 'Rose', sand: 'Sand' };
  const COLOR_GROUPS = [
    { title: 'Deep', colors: ['midnight', 'plum', 'petrol', 'umber'] },
    { title: 'Soft', colors: ['sky', 'lavender', 'rose', 'sand'] }
  ];

  // Advanced is collapsed every time Settings is opened from the nav; it only
  // stays open across the re-render that follows a successful import.
  let advancedOpen = false;

  /* ---------------- Wake Lock (keep screen on) ----------------
     Best-effort only: unsupported browsers just keep the toggle off and
     the app still works normally without it. Re-acquired on tab return
     since the OS/browser silently drops the lock when the tab is hidden. */
  let wakeLock = null;
  function releaseWakeLock() {
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
  }
  function requestWakeLock() {
    if (!('wakeLock' in navigator)) return Promise.reject(new Error('unsupported'));
    return navigator.wakeLock.request('screen').then(function (wl) {
      wakeLock = wl;
      wl.addEventListener('release', function () { wakeLock = null; });
    });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && UX.getKeepAwake() && !wakeLock) {
      requestWakeLock().catch(function () {});
    }
  });

  /* ---------------- Local data: export / import / delete ---------------- */
  function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function showToast(msg, kind) {
    const t = h('div', { class: 'settings-toast settings-toast-' + (kind || 'ok'), text: msg });
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 250);
    }, 2200);
  }

  /* ---------------- Small reusable row builders ---------------- */
  function settingsRow(iconName, title, sub, control, tone) {
    return h('div', { class: 'settings-row' }, [
      h('span', { class: 'settings-row-icon ' + (tone || 'tone-slate') }, [icon(iconName)]),
      h('div', { class: 'settings-row-text' }, [
        h('div', { class: 'settings-row-title', text: title }),
        sub ? h('div', { class: 'settings-row-sub', text: sub }) : null
      ]),
      control
    ]);
  }

  function segmented(options, activeValue, onChange) {
    const wrap = h('div', { class: 'segmented' });
    options.forEach(function (opt) {
      const btn = h('button', {
        class: 'segmented-btn' + (opt.value === activeValue ? ' active' : ''),
        onclick: function () {
          wrap.querySelectorAll('.segmented-btn').forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
          onChange(opt.value);
        }
      }, [
        opt.icon ? icon(opt.icon, 'segmented-icon') : null,
        h('span', { class: 'segmented-label', text: opt.label }),
        opt.sub ? h('span', { class: 'segmented-sub', text: opt.sub }) : null
      ]);
      btn.setAttribute('aria-pressed', opt.value === activeValue ? 'true' : 'false');
      if (opt.title) btn.setAttribute('title', opt.title);
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function toggleSwitch(checked, onChange) {
    const input = h('input', { type: 'checkbox', class: 'switch-input visually-hidden' });
    input.checked = !!checked;
    input.addEventListener('change', function () { onChange(input.checked); });
    return h('label', { class: 'switch' }, [input, h('span', { class: 'switch-track' })]);
  }

  /* ================= Settings screen ================= */
  function render(opts) {
    if (!(opts && opts.keepAdvanced)) advancedOpen = false;
    const screen = document.getElementById('screen-container');
    if (!screen) return;
    clear(screen);
    if (global.UI && global.UI.showNav) global.UI.showNav('settings');
    if (global.UI && global.UI.setRoute) global.UI.setRoute({ screen: 'settings' });

    screen.appendChild(h('header', { class: 'app-header' }, [h('h1', { class: 'title-lg', text: 'Settings' })]));

    /* ---- Appearance ---- */
    screen.appendChild(h('h2', { class: 'section-title-flat' }, [icon('palette'), h('span', { text: 'Appearance' })]));
    const appearanceCard = h('div', { class: 'card settings-card' });

    const themeRow = h('div', { class: 'settings-row settings-row-block' }, [
      h('span', { class: 'settings-row-icon tone-violet' }, [icon('sun-moon')]),
      h('div', { class: 'settings-row-text' }, [
        h('div', { class: 'settings-row-title', text: 'Theme mode' }),
        h('div', { class: 'settings-row-sub', text: 'Light, dark, or follow your device' })
      ])
    ]);
    themeRow.classList.add('settings-row-flush');
    appearanceCard.appendChild(themeRow);
    const themeSeg = segmented(
      [
        { value: 'light', label: 'Light', icon: 'sun' },
        { value: 'dark', label: 'Dark', icon: 'moon' },
        { value: 'system', label: 'System', icon: 'monitor' }
      ],
      UX.getThemePreference(),
      function (val) { UX.setTheme(val); }
    );
    themeSeg.classList.add('segmented-full');
    themeSeg.setAttribute('role', 'group');
    themeSeg.setAttribute('aria-label', 'Theme mode');
    appearanceCard.appendChild(h('div', { class: 'settings-seg-wrap' }, [themeSeg]));

    const colorRow = h('div', { class: 'settings-row settings-row-block' }, [
      h('span', { class: 'settings-row-icon tone-rose' }, [icon('swatch-book')]),
      h('div', { class: 'settings-row-text' }, [
        h('div', { class: 'settings-row-title', text: 'Accent color' }),
        h('div', { class: 'settings-row-sub', text: 'Default keeps the app multi-colored. Pick a palette to use one accent everywhere.' })
      ])
    ]);
    appearanceCard.appendChild(colorRow);

    const colorPicker = h('div', { class: 'theme-color-picker', role: 'group', 'aria-label': 'Accent color' });
    function markActiveColor() {
      const cur = UX.getThemeColor();
      colorPicker.querySelectorAll('.theme-color-swatch').forEach(function (b) {
        const on = b.dataset.color === cur;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    function swatchButton(color, label, dotClass) {
      const b = h('button', {
        type: 'button', class: 'theme-color-swatch', 'data-color': color,
        onclick: function () { UX.setThemeColor(color); markActiveColor(); }
      }, [
        h('span', { class: 'swatch-dot ' + dotClass }),
        h('span', { class: 'swatch-label', text: label })
      ]);
      return b;
    }
    // "Default" is not one of the 8 palettes: it is the way back to the
    // multi-colored look with no forced accent.
    colorPicker.appendChild(h('div', { class: 'theme-color-group theme-color-default' }, [
      swatchButton('default', 'Default · multi-color', 'swatch-default')
    ]));
    COLOR_GROUPS.forEach(function (g) {
      const grid = h('div', { class: 'theme-color-grid' });
      g.colors.forEach(function (c) { grid.appendChild(swatchButton(c, COLOR_LABELS[c] || c, 'swatch-' + c)); });
      colorPicker.appendChild(h('div', { class: 'theme-color-group' }, [
        h('div', { class: 'theme-color-group-title', text: g.title }),
        grid
      ]));
    });
    appearanceCard.appendChild(colorPicker);
    markActiveColor();

    appearanceCard.appendChild(settingsRow('lightbulb', 'Keep screen awake', 'Stops the screen from turning off while you study', toggleSwitch(
      UX.getKeepAwake(),
      function (checked) {
        UX.setKeepAwake(checked);
        if (checked) {
          requestWakeLock().catch(function () {
            showToast('This browser does not support keeping the screen awake', 'warn');
          });
        } else {
          releaseWakeLock();
        }
      }
    ), 'tone-amber'));
    screen.appendChild(appearanceCard);

    /* ---- Advanced (collapsed by default) ---- */
    const advancedPanel = h('div', { class: 'advanced-panel', id: 'advanced-panel' });
    advancedPanel.hidden = !advancedOpen;
    const advancedToggle = h('button', {
      type: 'button',
      class: 'advanced-toggle' + (advancedOpen ? ' open' : ''),
      'aria-expanded': advancedOpen ? 'true' : 'false',
      'aria-controls': 'advanced-panel',
      onclick: function () {
        advancedOpen = !advancedOpen;
        advancedPanel.hidden = !advancedOpen;
        advancedToggle.classList.toggle('open', advancedOpen);
        advancedToggle.setAttribute('aria-expanded', advancedOpen ? 'true' : 'false');
        if (advancedOpen) fillStorageRow();
      }
    }, [
      icon('sliders-horizontal', 'advanced-toggle-icon'),
      h('span', { class: 'advanced-toggle-label', text: 'Advanced' }),
      icon('chevron-down', 'advanced-chevron')
    ]);
    screen.appendChild(advancedToggle);
    screen.appendChild(advancedPanel);

    /* ---- Data ---- */
    const dataCard = h('div', { class: 'card settings-card' });

    dataCard.appendChild(h('button', {
      class: 'btn btn-secondary settings-action-btn',
      onclick: function () {
        const data = UX.exportAllData();
        const stamp = new Date(data.exportedAt).toISOString().slice(0, 10);
        downloadJSON(data, 'eenglish-backup-' + stamp + '.json');
        showToast('Your data was exported', 'ok');
      }
    }, [icon('download'), h('span', { text: 'Export Data' })]));

    const importInput = h('input', { type: 'file', accept: 'application/json', class: 'visually-hidden' });
    importInput.addEventListener('change', function () {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        let parsed = null;
        try { parsed = JSON.parse(String(reader.result)); } catch (e) { parsed = null; }
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          if (!confirm('Importing will replace your current progress with the data in this file. Continue?')) return;
        }
        if (parsed && UX.importAllData(parsed)) {
          showToast('Data imported successfully', 'ok');
          render({ keepAdvanced: true });
        } else {
          showToast('This file is not a valid E.English backup', 'warn');
        }
      };
      reader.readAsText(file);
      importInput.value = '';
    });
    dataCard.appendChild(importInput);
    dataCard.appendChild(h('button', {
      class: 'btn btn-secondary settings-action-btn',
      onclick: function () { importInput.click(); }
    }, [icon('upload'), h('span', { text: 'Import Data' })]));

    dataCard.appendChild(h('button', {
      class: 'btn btn-danger settings-action-btn',
      onclick: function () {
        if (confirm('Are you sure? All your progress (learned words, review lists, and quiz history) will be deleted permanently.')) {
          releaseWakeLock();
          UX.resetAllData();
          global.location.reload();
        }
      }
    }, [icon('trash-2'), h('span', { text: 'Delete All Data' })]));
    advancedPanel.appendChild(dataCard);

    /* ---- Advanced: device / browser capabilities ----
       Every value comes straight from a browser API — nothing here is
       guessed or computed indirectly. If the API isn't exposed by this
       browser, the row shows "N/A" instead of a fabricated number. */
    const deviceCard = h('div', { class: 'card settings-card device-info-card' });
    deviceCard.appendChild(h('div', { class: 'settings-row-title device-info-head' }, [icon('monitor-smartphone'), h('span', { text: 'Device & Browser' })]));

    function infoRow(label, value) {
      return h('div', { class: 'device-info-row' }, [
        h('span', { class: 'text-muted', text: label }),
        h('span', { class: 'device-info-value', text: value })
      ]);
    }
    const nav = global.navigator || {};
    const rowsWrap = h('div', { class: 'device-info-rows' });
    rowsWrap.appendChild(infoRow('Logical CPU cores', typeof nav.hardwareConcurrency === 'number' ? String(nav.hardwareConcurrency) : 'N/A'));
    rowsWrap.appendChild(infoRow('Approx. memory (RAM)', typeof nav.deviceMemory === 'number' ? (nav.deviceMemory + ' GB') : 'N/A'));
    rowsWrap.appendChild(infoRow('Connection type', (nav.connection && nav.connection.effectiveType) ? nav.connection.effectiveType : 'N/A'));
    rowsWrap.appendChild(infoRow('Connection status', typeof nav.onLine === 'boolean' ? (nav.onLine ? 'Online' : 'Offline') : 'N/A'));
    rowsWrap.appendChild(infoRow('Platform', nav.platform || (nav.userAgentData && nav.userAgentData.platform) || 'N/A'));
    rowsWrap.appendChild(infoRow('Browser language', nav.language || 'N/A'));
    rowsWrap.appendChild(infoRow('Screen size', (global.screen && global.screen.width) ? (global.screen.width + ' × ' + global.screen.height + ' px') : 'N/A'));
    rowsWrap.appendChild(infoRow('Pixel density (DPR)', typeof global.devicePixelRatio === 'number' ? String(global.devicePixelRatio) : 'N/A'));
    const storageRow = infoRow('Storage used', 'Calculating...');
    rowsWrap.appendChild(storageRow);
    deviceCard.appendChild(rowsWrap);
    advancedPanel.appendChild(deviceCard);

    function formatBytes(n) {
      if (typeof n !== 'number' || !isFinite(n)) return 'N/A';
      if (n < 1024) return n + ' B';
      const units = ['KB', 'MB', 'GB', 'TB'];
      let v = n, i = -1;
      do { v /= 1024; i++; } while (v >= 1024 && i < units.length - 1);
      return v.toFixed(1) + ' ' + units[i];
    }
    // Storage estimate is only computed the first time Advanced is opened.
    let storageFilled = false;
    function fillStorageRow() {
      if (storageFilled) return;
      storageFilled = true;
      const valueEl = storageRow.querySelector('.device-info-value');
      if (!valueEl) return;
      if (nav.storage && typeof nav.storage.estimate === 'function') {
        nav.storage.estimate().then(function (est) {
          const used = formatBytes(est && est.usage);
          const quota = formatBytes(est && est.quota);
          valueEl.textContent = (used === 'N/A' || quota === 'N/A') ? 'N/A' : (used + ' / ' + quota);
        }).catch(function () { valueEl.textContent = 'N/A'; });
      } else {
        valueEl.textContent = 'N/A';
      }
    }
    if (advancedOpen) fillStorageRow();
  }

  global.UI = global.UI || {};
  global.UI.renderSettings = render;

  // Best-effort re-acquire on boot if the user had it on last time — most
  // browsers require a user gesture, so this may silently fail and that's
  // fine; the visibilitychange listener above tries again once the person
  // actually interacts with the tab.
  if (UX.getKeepAwake()) requestWakeLock().catch(function () {});
})(window);
