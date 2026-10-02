/* ui.js — Presentation layer only. NO business logic, NO direct localStorage.
   Everything here reads/writes state exclusively through window.UX. */
(function (global) {
  'use strict';

  /* ---------------- DOM helpers ---------------- */
  function h(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
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
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
  // Pure formatting / labels only (no logic, no state) come from the quiz
  // engine so a score, a percentage or a clock is written the same everywhere.
  const QE = global.QuizEngine;

  const el = { screen: null, nav: null, sideNav: null, themeBtn: null };
  const NAV_ICONS = { home: 'house', statistics: 'chart-column', history: 'history', settings: 'settings', info: 'info', readme: 'book-open-text' };
  let route = { screen: 'home' };
  let lessonProgressRef = null; // { unit, lessonKey, fillEl, textEl } — live-updated, not rebuilt
  let lessonQuizRef = null; // { unit, lessonKey, selectedBtn, selectedMeta, hintEl } — Selected Quiz availability + estimate, live-updated
  let statsRefs = null; // live-updatable stats DOM refs, set by renderStatistics()

  // Both nav bars (bottom nav for phones, side nav for large screens) are
  // always kept in the same state — CSS alone decides which one is
  // actually visible at a given viewport width (see responsive.css).
  function eachNav(fn) {
    [el.nav, el.sideNav].forEach(function (n) { if (n) fn(n); });
  }
  function showNav(active) {
    // The floating theme button would sit on top of the quiz timer, and a theme
    // switch mid-quiz is a distraction: hide it while a quiz is running.
    document.body.classList.toggle('quiz-active', !!UX.getCurrentQuiz());
    eachNav(function (n) {
      n.hidden = false;
      n.querySelectorAll('.nav-btn').forEach(function (b) {
        b.classList.toggle('active', b.dataset.nav === active);
      });
    });
  }
  function wireNav(navEl) {
    if (!navEl) return;
    navEl.querySelectorAll('.nav-btn').forEach(function (b) {
      const iconName = NAV_ICONS[b.dataset.nav];
      if (iconName && !b.querySelector('.icon')) b.insertBefore(icon(iconName), b.firstChild);
      b.addEventListener('click', function () {
        if (b.dataset.nav === 'home') renderHome();
        else if (b.dataset.nav === 'statistics') renderStatistics();
        else if (b.dataset.nav === 'history') renderHistory();
        // 'settings' is implemented in JavaScript/settings.js (loaded
        // after this file) which attaches UI.renderSettings — resolved
        // dynamically here so load order between the two doesn't matter.
        else if (b.dataset.nav === 'settings' && global.UI && global.UI.renderSettings) global.UI.renderSettings();
        else if (b.dataset.nav === 'info') renderInfo();
        else if (b.dataset.nav === 'readme' && global.UI && global.UI.renderReadme) global.UI.renderReadme();
      });
    });
  }

  /* ---------------- Theme ----------------
     ONE source of truth: UX.getThemePreference() ('light' | 'dark' | 'system').
     The floating button and the Settings selector both read it and both
     write it through UX.setTheme(), so they can never disagree. */
  const THEME_CYCLE = ['light', 'dark', 'system'];
  const THEME_META = {
    light: { icon: 'sun', label: 'Light' },
    dark: { icon: 'moon', label: 'Dark' },
    system: { icon: 'monitor', label: 'System' }
  };
  // The icon shows the CURRENT preference (so "System" is visibly "System");
  // the label tells what a tap does next: Light → Dark → System → Light.
  function syncThemeButton() {
    if (!el.themeBtn) return;
    const pref = UX.getThemePreference();
    const next = THEME_CYCLE[(THEME_CYCLE.indexOf(pref) + 1) % THEME_CYCLE.length];
    clear(el.themeBtn);
    el.themeBtn.appendChild(icon(THEME_META[pref].icon));
    el.themeBtn.setAttribute('data-mode', pref);
    el.themeBtn.setAttribute('title', 'Theme: ' + THEME_META[pref].label);
    el.themeBtn.setAttribute('aria-label', 'Theme: ' + THEME_META[pref].label + '. Switch to ' + THEME_META[next].label + '.');
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    syncThemeButton();
    syncMetaThemeColor();
  }
  // Accent palette — independent from light/dark; see CSS/root.css. The
  // default look (no accent picked) has NO data-color attribute at all, so
  // nothing can leak a forced accent into it.
  function applyThemeColor(color) {
    if (!color || color === 'default') document.documentElement.removeAttribute('data-color');
    else document.documentElement.setAttribute('data-color', color);
    syncMetaThemeColor();
  }
  // Browser/mobile toolbar color follows the active theme + accent: the
  // page background in the default look and in dark mode, the palette's
  // accent fill in light mode when an accent has been picked.
  function syncMetaThemeColor() {
    const meta = document.getElementById('meta-theme-color');
    if (!meta) return;
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    const dark = root.getAttribute('data-theme') === 'dark';
    const useAccent = !dark && root.hasAttribute('data-color');
    const val = (useAccent ? cs.getPropertyValue('--color-primary') : cs.getPropertyValue('--color-bg')).trim();
    if (val) meta.setAttribute('content', val);
  }

  /* ---------------- Part of speech ----------------
     Contract (unchanged): a word line may end in "[n.]", "[v.]", "[adj.]",
     "[adv.]", "[n./v.]", "[phr.v.]" ... The parser in ux.js strips it into
     word.pos; this is presentation only. Each part of speech maps to ONE
     color category (CSS: .pos-noun … .pos-other); a slash-separated tag
     ("n./v.") is drawn as one badge per part, each in its own color. */
  function posCategory(tag) {
    const t = String(tag || '').toLowerCase().replace(/\s+/g, '').replace(/\.+$/, '');
    const base = t.replace(/\.?phr$/, '');            // n.phr → n, adj.phr → adj
    const key = t === 'phr.v' ? 'v' : (t === 'phr' ? 'phr' : base);
    switch (key) {
      case 'n': case 'noun': return 'noun';
      case 'v': case 'vb': case 'verb': return 'verb';
      case 'adj': case 'adjective': return 'adj';
      case 'adv': case 'adverb': return 'adv';
      case 'pron': case 'pronoun': return 'pron';
      case 'prep': case 'preposition': return 'prep';
      case 'conj': case 'conjunction': return 'conj';
      default: return 'other';
    }
  }
  function renderPosBadges(pos) {
    const wrap = h('span', { class: 'pos-group' });
    String(pos).split('/').forEach(function (part) {
      part = part.trim();
      if (part) wrap.appendChild(h('span', { class: 'pos-badge pos-' + posCategory(part), text: part }));
    });
    return wrap;
  }
  // Every tag the app colors, for the Info screen. Order = display order.
  const POS_INFO = [
    { tag: 'n.', name: 'Noun', text: 'A word used to name a person, place, thing, or idea.', example: 'teacher, city, freedom' },
    { tag: 'v.', name: 'Verb', text: 'A word that describes an action, a state, or something that happens.', example: 'write, seem, happen' },
    { tag: 'adj.', name: 'Adjective', text: 'A word that describes a noun or gives more information about it.', example: 'careful, modern, heavy' },
    { tag: 'adv.', name: 'Adverb', text: 'A word that describes a verb, an adjective, or another adverb.', example: 'quickly, very, often' },
    { tag: 'pron.', name: 'Pronoun', text: 'A word used in place of a noun so you do not have to repeat it.', example: 'she, them, this' },
    { tag: 'prep.', name: 'Preposition', text: 'A word that shows how a noun relates to another word, such as place, time, or direction.', example: 'in, between, during' },
    { tag: 'conj.', name: 'Conjunction', text: 'A word that joins words, phrases, or sentences together.', example: 'and, but, because' },
    { tag: 'phr.v.', name: 'Phrasal verb', text: 'A verb combined with a small word (a particle) that gives it a new meaning. It works as one verb.', example: 'turn off, take over' },
    { tag: 'n.phr.', name: 'Noun phrase', text: 'A group of words that works together as a noun.', example: 'private sector, renewable energy' },
    { tag: 'adj.phr.', name: 'Adjective phrase', text: 'A group of words that works together as an adjective.', example: 'connected to' },
    { tag: 'phr.', name: 'Phrase', text: 'A fixed group of words that is learned as one unit and does not fit the other groups.', example: '' },
    { tag: 'other', name: 'Other', text: 'Any tag that is not listed above. It is shown in a neutral color.', example: '' }
  ];

  /* Custom checkbox: hidden native input (for real change events + a11y)
     plus a styled box with check/minus local SVG icons toggled by CSS
     (:checked / :indeterminate), per "checkbox state must be obvious". */
  function customCheckbox(opts) {
    const input = h('input', { type: 'checkbox', class: 'cb-input visually-hidden' });
    if (opts.checked) input.checked = true;
    if (opts.onchange) input.addEventListener('change', function () { opts.onchange(input.checked); });
    const box = h('span', { class: 'cb-box' }, [
      icon('check', 'cb-icon-checked'),
      icon('minus', 'cb-icon-indeterminate')
    ]);
    const label = h('label', { class: 'cb-wrap' + (opts.extraClass ? ' ' + opts.extraClass : '') }, [input, box]);
    if (opts.trailing) label.appendChild(opts.trailing);
    label._input = input;
    return label;
  }

  /* ---------------- Section metadata (icons + labels only — presentation) ----------------
     Dynamic by design: an unknown section type still renders via the
     fallback in sectionMeta() below, so a new file type (e.g. a future
     Derivatives-like section) works without a JS change — this map only
     upgrades the icon/label once someone wants a nicer one. */
  const SECTION_META = {
    vocabulary: { label: 'Vocabulary', icon: 'book-a', className: 'sec-vocabulary' },
    synonyms_antonyms: { label: 'Synonyms & Antonyms', icon: 'arrow-left-right', className: 'sec-synonyms' },
    idioms: { label: 'Idioms & Phrasal Verbs', icon: 'message-square-quote', className: 'sec-idioms' },
    derivatives: { label: 'Derivatives', icon: 'list-tree', className: 'sec-derivatives' }
  };
  function sectionMeta(type) {
    return SECTION_META[type] || { label: String(type).replace(/_/g, ' '), icon: 'file-text', className: 'sec-generic' };
  }

  /* ================= Skeleton ================= */
  function renderSkeleton() {
    route = { screen: 'skeleton' };
    clear(el.screen);
    eachNav(function (n) { n.hidden = true; });
    const wrap = h('div', { class: 'skeleton-wrap' });
    wrap.appendChild(h('div', { class: 'sk sk-header' }));
    wrap.appendChild(h('div', { class: 'sk sk-search' }));
    for (let i = 0; i < 3; i++) wrap.appendChild(h('div', { class: 'sk sk-card' }));
    for (let i = 0; i < 2; i++) wrap.appendChild(h('div', { class: 'sk sk-group' }));
    el.screen.appendChild(wrap);
  }

  /* ================= Load-blocked (file://) ================= */
  function renderLoadBlocked() {
    route = { screen: 'load-blocked' };
    clear(el.screen);
    eachNav(function (n) { n.hidden = true; });
    const wrap = h('div', { class: 'card blocked-card' }, [
      icon('server-off', 'blocked-icon'),
      h('h1', { class: 'title-lg', text: 'Run the site from a local server' }),
      h('p', { class: 'text-muted', text: 'Browsers block reading the Files/*.md lessons when index.html is opened directly by double-click.' }),
      h('ol', { class: 'blocked-steps' }, [
        h('li', { text: 'With VS Code: install the Live Server extension and open index.html with it.' }),
        h('li', { text: 'Or open a terminal in the project folder and run: python -m http.server 8000' }),
        h('li', { text: 'Then open http://localhost:8000 in your browser.' })
      ])
    ]);
    el.screen.appendChild(wrap);
  }

  /* ================= Home ================= */
  function renderHome() {
    route = { screen: 'home' };
    clear(el.screen);
    const units = UX.getUnits();

    el.screen.appendChild(h('header', { class: 'app-header' }, [
      h('img', { src: 'Ui/Logo.png', alt: 'E.English', class: 'app-logo' }),
      h('div', {}, [
        h('h1', { class: 'title-xl', text: 'E.English' }),
        h('p', { class: 'text-muted', text: 'Choose a unit to start studying' })
      ])
    ]));

    const searchBox = h('div', { class: 'search-box' });
    searchBox.appendChild(icon('search', 'search-icon'));
    const searchInput = h('input', { type: 'text', class: 'search-input', placeholder: 'Search for a word...', 'aria-label': 'Search words' });
    searchInput.addEventListener('input', function () { UX.search(searchInput.value); });
    searchBox.appendChild(searchInput);
    el.screen.appendChild(searchBox);
    el.screen.appendChild(h('div', { class: 'search-results', id: 'search-results' }));

    const list = h('div', { class: 'card-grid' });
    if (!units.length) {
      list.appendChild(h('p', { class: 'empty-note', text: 'No content is available right now.' }));
    } else {
      units.forEach(function (unit) {
        list.appendChild(h('button', { class: 'nav-card', onclick: function () { renderUnit(unit.unit); } }, [
          icon('library', 'nav-card-icon tone-blue'),
          h('div', { class: 'nav-card-text' }, [
            h('div', { class: 'nav-card-title', text: 'Unit ' + unit.unit }),
            h('div', { class: 'nav-card-sub', text: plural(unit.lessons.length, 'lesson set', 'lesson sets') })
          ]),
          icon('chevron-right', 'nav-card-chevron')
        ]));
      });
    }
    el.screen.appendChild(list);
    showNav('home');
    renderSearchResults({ results: [] });
  }

  function renderSearchResults(payload) {
    const container = document.getElementById('search-results');
    if (!container) return;
    clear(container);
    const results = (payload && payload.results) || [];
    if (!results.length) return;
    container.appendChild(h('div', { class: 'search-results-head', text: plural(results.length, 'result', 'results') }));
    results.forEach(function (r) {
      container.appendChild(h('button', { class: 'result-row', onclick: function () { navigateToWord(r.wordId); } }, [
        icon(sectionMeta(r.type).icon, 'result-icon ' + sectionMeta(r.type).className),
        h('div', { class: 'result-text' }, [
          h('span', { class: 'result-word', text: r.word }),
          h('span', { class: 'result-meaning', dir: 'auto', text: r.meaning })
        ]),
        h('span', { class: 'result-loc', text: 'U' + r.unit + ' · L' + r.lessons.join('-') })
      ]));
    });
  }

  /* ================= Unit ================= */
  function renderUnit(unitNum) {
    route = { screen: 'unit', unit: unitNum };
    clear(el.screen);
    const unit = UX.getUnits().find(function (u) { return u.unit === unitNum; });
    if (!unit) { renderHome(); return; }

    el.screen.appendChild(h('header', { class: 'app-header' }, [
      h('button', { class: 'icon-btn back-btn', 'aria-label': 'Back', onclick: renderHome }, [icon('arrow-left')]),
      h('h1', { class: 'title-lg', text: 'Unit ' + unitNum })
    ]));

    const list = h('div', { class: 'card-grid' });
    unit.lessons.forEach(function (lesson) {
      const key = lesson.lessons.join('-');
      list.appendChild(h('button', { class: 'nav-card', onclick: function () { renderLesson(unitNum, key); } }, [
        icon('notebook-text', 'nav-card-icon tone-violet'),
        h('div', { class: 'nav-card-text' }, [
          h('div', { class: 'nav-card-title', text: 'Lesson ' + lesson.lessons.join('-') }),
          h('div', { class: 'nav-card-sub', text: plural(lesson.sections.length, 'section', 'sections') })
        ]),
        icon('chevron-right', 'nav-card-chevron')
      ]));
    });
    el.screen.appendChild(list);
    showNav('home');
  }

  /* ================= Lesson ================= */
  function renderLesson(unitNum, lessonKey, opts) {
    route = { screen: 'lesson', unit: unitNum, lessonKey: lessonKey };
    opts = opts || {};
    clear(el.screen);
    const unit = UX.getUnits().find(function (u) { return u.unit === unitNum; });
    if (!unit) { renderHome(); return; }
    const lesson = unit.lessons.find(function (l) { return l.lessons.join('-') === lessonKey; });
    if (!lesson) { renderUnit(unitNum); return; }

    el.screen.appendChild(h('header', { class: 'app-header' }, [
      h('button', { class: 'icon-btn back-btn', onclick: function () { renderUnit(unitNum); } }, [icon('arrow-left')]),
      h('h1', { class: 'title-lg', text: 'Unit ' + unitNum + ' · Lesson ' + lessonKey })
    ]));

    const groupOfFocus = opts.focusWordId ? findGroupIndexForWord(lesson, opts.focusWordId) : null;
    lessonProgressRef = null;
    lessonQuizRef = null;

    const sectionsWrap = h('div', { class: 'sections-wrap' });

    // Sections whose file failed to load (per app.json) get a visible
    // warning card instead of silently disappearing.
    UX.getMissingSections().forEach(function (m) {
      if (m.unit !== unitNum || m.lessons.join('-') !== lessonKey) return;
      const meta = sectionMeta(m.type);
      sectionsWrap.appendChild(h('section', { class: 'section-card section-missing' }, [
        h('div', { class: 'section-card-head' }, [
          h('span', { class: 'section-icon-badge section-icon-warning' }, [icon('triangle-alert')]),
          h('div', { class: 'section-head-text' }, [
            h('h2', { class: 'section-title', text: meta.label }),
            h('span', { class: 'section-count text-warning', text: 'This section could not be loaded' })
          ])
        ])
      ]));
    });

    lesson.sections.forEach(function (section) {
      const meta = sectionMeta(section.type);
      const wordCount = section.groups.reduce(function (a, g) { return a + g.words.length; }, 0);

      const card = h('section', { class: 'section-card ' + meta.className });
      const headText = h('div', { class: 'section-head-text' }, [
        h('h2', { class: 'section-title', text: meta.label }),
        h('span', { class: 'section-count', text: plural(wordCount, 'word', 'words') })
      ]);
      card.appendChild(h('div', { class: 'section-card-head' }, [
        h('span', { class: 'section-icon-badge' }, [icon(meta.icon)]),
        headText
      ]));

      if (section.type === 'vocabulary') {
        // Vocabulary-only progress for this lesson (kept separate from
        // Synonyms/Idioms/Derivatives — see UX.getLessonVocabularyProgress).
        const vp = UX.getLessonVocabularyProgress(unitNum, lessonKey);
        const progressWrap = h('div', { class: 'mini-progress' });
        const progressFill = h('div', { class: 'mini-progress-fill' });
        progressFill.style.width = Math.round(vp.progress * 100) + '%';
        progressWrap.appendChild(progressFill);
        const progressText = h('span', { class: 'mini-progress-text', text: vp.known + '/' + vp.total + ' (' + Math.round(vp.progress * 100) + '%)' });
        headText.appendChild(h('div', { class: 'mini-progress-row' }, [progressWrap, progressText]));
        lessonProgressRef = { unit: unitNum, lessonKey: lessonKey, fillEl: progressFill, textEl: progressText };

        const canSelected = UX.canStartSelectedQuiz(unitNum, lessonKey);
        const row = h('div', { class: 'quiz-launch-row' });
        const fullMeta = h('span', { class: 'quiz-launch-meta' });
        const selectedMeta = h('span', { class: 'quiz-launch-meta' });
        const fullBtn = h('button', {
          class: 'btn btn-primary quiz-launch',
          onclick: function () { if (UX.startFullQuiz(unitNum, lessonKey)) renderQuiz(); }
        }, [icon('clipboard-list'), h('span', { class: 'quiz-launch-text' }, [h('span', { class: 'quiz-launch-title', text: 'Full Quiz' }), fullMeta])]);
        const selectedBtn = h('button', {
          class: 'btn btn-secondary quiz-launch' + (canSelected ? '' : ' is-disabled'),
          disabled: !canSelected,
          onclick: function () { if (UX.canStartSelectedQuiz(unitNum, lessonKey) && UX.startSelectedQuiz(unitNum, lessonKey)) renderQuiz(); }
        }, [icon('list-checks'), h('span', { class: 'quiz-launch-text' }, [h('span', { class: 'quiz-launch-title', text: 'Selected Quiz' }), selectedMeta])]);
        row.appendChild(fullBtn);
        row.appendChild(selectedBtn);
        card.appendChild(row);
        const hintEl = h('p', { class: 'hint-note', text: 'Mark some words as learned first to unlock the Selected Quiz.' });
        hintEl.hidden = canSelected;
        card.appendChild(hintEl);
        lessonQuizRef = { unit: unitNum, lessonKey: lessonKey, selectedBtn: selectedBtn, selectedMeta: selectedMeta, hintEl: hintEl };
        fullMeta.textContent = quizMetaText(UX.getQuizPreview(unitNum, lessonKey, 'full'));
        refreshQuizButtons();
      }

      const groupsWrap = h('div', { class: 'groups-wrap' });
      section.groups.forEach(function (group, gi) {
        const forceOpen = !!(groupOfFocus && groupOfFocus.type === section.type && groupOfFocus.groupIdx === gi);
        groupsWrap.appendChild(renderGroup(group, gi, forceOpen));
      });
      card.appendChild(groupsWrap);

      sectionsWrap.appendChild(card);
    });
    el.screen.appendChild(sectionsWrap);

    if (opts.focusWordId) {
      setTimeout(function () {
        const node = document.querySelector('[data-word-id="' + cssEscape(opts.focusWordId) + '"]');
        if (node) {
          if (typeof node.scrollIntoView === 'function') node.scrollIntoView({ behavior: 'smooth', block: 'center' });
          node.classList.add('highlight-flash');
          setTimeout(function () { node.classList.remove('highlight-flash'); }, 2200);
        }
      }, 80);
    }
    showNav('home');
  }

  function cssEscape(s) {
    return String(s).replace(/[^a-zA-Z0-9_\-]/g, function (c) { return '\\' + c; });
  }

  function findGroupIndexForWord(lesson, wordId) {
    for (let si = 0; si < lesson.sections.length; si++) {
      const section = lesson.sections[si];
      for (let gi = 0; gi < section.groups.length; gi++) {
        if (section.groups[gi].words.some(function (w) { return w.wordId === wordId; })) {
          return { type: section.type, groupIdx: gi };
        }
      }
    }
    return null;
  }

  /* ================= Group (collapsible) ================= */
  function renderGroup(group, groupIdx, forceOpen) {
    const wordIds = group.words.map(function (w) { return w.wordId; });
    const wrap = h('div', { class: 'group' + (forceOpen ? ' open' : '') });

    const known = wordIds.filter(function (id) { return UX.isKnown(id); }).length;

    const cb = customCheckbox({
      checked: UX.getGroupTriState(wordIds) === 'checked',
      extraClass: 'group-cb',
      onchange: function (checked) { UX.setGroupKnown(wordIds, checked); }
    });
    applyTriState(cb._input, UX.getGroupTriState(wordIds));

    const toggleBtn = h('button', { class: 'group-toggle', 'aria-label': 'Expand or collapse group', 'aria-expanded': forceOpen ? 'true' : 'false' }, [
      icon('chevron-right', 'group-chevron')
    ]);

    const head = h('div', { class: 'group-head' }, [
      cb,
      h('span', { class: 'group-title', text: group.title || ('Group ' + (groupIdx + 1)) }),
      h('span', { class: 'group-count', text: known + '/' + wordIds.length }),
      toggleBtn
    ]);

    const body = h('div', { class: 'group-body' });
    group.words.forEach(function (w) { body.appendChild(renderWord(w)); });

    function toggleOpen() {
      const isOpen = wrap.classList.toggle('open');
      toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
    toggleBtn.addEventListener('click', toggleOpen);
    head.querySelector('.group-title').addEventListener('click', toggleOpen);
    head.querySelector('.group-count').addEventListener('click', toggleOpen);

    wrap.appendChild(head);
    wrap.appendChild(body);
    return wrap;
  }

  function applyTriState(input, tri) {
    if (tri === 'checked') { input.checked = true; input.indeterminate = false; }
    else if (tri === 'unchecked') { input.checked = false; input.indeterminate = false; }
    else { input.checked = false; input.indeterminate = true; }
  }

  /* ================= Word Card =================
     article.word-card
       header.word-card-head  → [checkbox] [word + POS] [difficulty]
       p.word-meaning
       div.word-extras        → only when the word has extras
       footer.word-card-foot  → [known state text] [manual-review flag]
     Presentation only: wordId, UX.isKnown / toggleKnown /
     isManualReview / toggleManualReview are used exactly as before. */
  function renderWordExtras(w) {
    const keys = Object.keys(w.extras || {}).filter(function (k) { return k !== '_raw' && w.extras[k]; });
    if (keys.length) {
      const chips = h('div', { class: 'word-extras' });
      keys.forEach(function (k) {
        const isSyn = /syn/i.test(k);
        chips.appendChild(h('span', { class: 'extra-chip' }, [
          icon(isSyn ? 'equal' : 'equal-not', 'extra-chip-icon'),
          h('span', { class: 'visually-hidden', text: k + ': ' }),
          h('span', { class: 'extra-chip-text', dir: 'auto', text: w.extras[k] })
        ]));
      });
      return chips;
    }
    if (w.extras && w.extras._raw && w.extras._raw.length) {
      return h('div', { class: 'word-extras word-extras-raw', text: w.extras._raw.join(' · ') });
    }
    return null;
  }

  function renderWord(w) {
    const card = h('article', { class: 'word-card ' + (w.status === 'easy' ? 'is-easy' : 'is-hard'), 'data-word-id': w.wordId });

    const cb = customCheckbox({
      checked: UX.isKnown(w.wordId),
      extraClass: 'word-cb',
      onchange: function () { UX.toggleKnown(w.wordId); }
    });
    cb._input.setAttribute('aria-label', 'Mark as learned: ' + w.word);

    const identity = h('div', { class: 'word-identity' }, [h('span', { class: 'word-text', text: w.word })]);
    if (w.pos) identity.appendChild(renderPosBadges(w.pos));

    const easy = w.status === 'easy';
    const diff = h('span', { class: 'diff-badge ' + (easy ? 'diff-easy' : 'diff-hard') }, [
      icon(easy ? 'smile' : 'flame'),
      h('span', { text: easy ? 'Easy' : 'Hard' })
    ]);
    card.appendChild(h('header', { class: 'word-card-head' }, [cb, identity, diff]));
    card.appendChild(h('p', { class: 'word-meaning', dir: 'auto', text: w.meaning }));

    const extras = renderWordExtras(w);
    if (extras) card.appendChild(extras);

    const stateIcon = h('span', { class: 'word-state-icon' });
    const stateText = h('span', { class: 'word-state-text' });
    const flagLabel = h('span', { class: 'flag-label' });
    const flag = h('button', {
      type: 'button',
      class: 'flag-btn',
      onclick: function () { UX.toggleReview(w.wordId); }
    }, [icon('flag'), flagLabel]);
    card.appendChild(h('footer', { class: 'word-card-foot' }, [
      h('span', { class: 'word-state' }, [stateIcon, stateText]),
      flag
    ]));

    syncWordCard(card, w.wordId);
    return card;
  }

  // Single place that maps UX state → card DOM (used on first render and
  // on every live refresh, so the two can never drift apart).
  function syncWordCard(card, id) {
    const known = UX.isKnown(id);
    // ONE review state: manual and quiz-made flags both count, so this card
    // always agrees with the Review list.
    const review = UX.needsReview(id);
    card.classList.toggle('is-known', known);
    card.classList.toggle('is-review', review);
    const source = UX.getReviewSource(id);
    if (source) card.setAttribute('data-review-source', source); else card.removeAttribute('data-review-source');

    const cb = card.querySelector('.cb-input');
    if (cb) cb.checked = known;

    const stateIcon = card.querySelector('.word-state-icon');
    if (stateIcon && stateIcon.dataset.known !== String(known)) {
      stateIcon.dataset.known = String(known);
      clear(stateIcon);
      stateIcon.appendChild(icon(known ? 'circle-check' : 'circle-dashed'));
    }
    const stateText = card.querySelector('.word-state-text');
    if (stateText) stateText.textContent = known ? 'Learned' : 'Not learned';

    const flag = card.querySelector('.flag-btn');
    if (flag) {
      flag.classList.toggle('active', review);
      flag.setAttribute('aria-pressed', review ? 'true' : 'false');
      flag.setAttribute('aria-label', review ? 'Remove from review' : 'Add to review');
      const label = flag.querySelector('.flag-label');
      if (label) label.textContent = review ? 'In review' : 'Review';
    }
  }

  function refreshWordStates() {
    document.querySelectorAll('.word-card').forEach(function (card) {
      syncWordCard(card, card.dataset.wordId);
    });
    document.querySelectorAll('.group').forEach(function (g) {
      const wordIds = [];
      g.querySelectorAll('.word-card').forEach(function (r) { wordIds.push(r.dataset.wordId); });
      const cb = g.querySelector('.group-cb .cb-input');
      if (cb) applyTriState(cb, UX.getGroupTriState(wordIds));
      const countEl = g.querySelector('.group-count');
      if (countEl) {
        const known = wordIds.filter(function (id) { return UX.isKnown(id); }).length;
        countEl.textContent = known + '/' + wordIds.length;
      }
    });
    refreshLessonProgress();
    refreshQuizButtons();
  }

  // Shown on a launch button BEFORE the quiz starts: word count and the
  // estimated range (see QuizEngine.estimateDuration). The range is an
  // estimate; the timer's real limit is deliberately higher.
  function quizMetaText(preview) {
    if (!preview.count) return 'No words yet';
    return 'Estimated time: ' + preview.label + ' \u00B7 ' + plural(preview.count, 'word', 'words');
  }
  // The Selected Quiz needs at least one learned word — follow the state
  // live, including its word count and estimated time.
  function refreshQuizButtons() {
    if (!lessonQuizRef) return;
    const can = UX.canStartSelectedQuiz(lessonQuizRef.unit, lessonQuizRef.lessonKey);
    lessonQuizRef.selectedBtn.disabled = !can;
    lessonQuizRef.selectedBtn.classList.toggle('is-disabled', !can);
    lessonQuizRef.hintEl.hidden = can;
    lessonQuizRef.selectedMeta.textContent = can
      ? quizMetaText(UX.getQuizPreview(lessonQuizRef.unit, lessonQuizRef.lessonKey, 'selected'))
      : 'Learn some words to unlock';
  }

  // Vocabulary-only progress bar inside the lesson's Vocabulary section
  // header — updated in place, never triggers a screen rebuild.
  function refreshLessonProgress() {
    if (!lessonProgressRef) return;
    const vp = UX.getLessonVocabularyProgress(lessonProgressRef.unit, lessonProgressRef.lessonKey);
    lessonProgressRef.fillEl.style.width = Math.round(vp.progress * 100) + '%';
    lessonProgressRef.textEl.textContent = vp.known + '/' + vp.total + ' (' + Math.round(vp.progress * 100) + '%)';
  }

  function renderReviewInto(container, stats) {
    clear(container);
    if (!stats.reviewWords.length) {
      container.appendChild(h('p', { class: 'empty-note', text: 'Nothing to review right now. Nice work!' }));
    } else {
      stats.reviewWords.forEach(function (r) {
        container.appendChild(h('button', { class: 'result-row review-row', onclick: function () { navigateToWord(r.wordId); } }, [
          icon(sectionMeta(r.type).icon, 'result-icon ' + sectionMeta(r.type).className),
          h('div', { class: 'result-text' }, [
            h('span', { class: 'result-word', text: r.word }),
            h('span', { class: 'result-meaning', dir: 'auto', text: r.meaning })
          ]),
          h('span', { class: 'result-loc', text: 'U' + r.unit + ' · L' + r.lessons.join('-') })
        ]));
      });
    }
  }

  // Statistics screen: patch just the numbers/lists that changed instead
  // of clearing and rebuilding the whole screen (keeps scroll position).
  function pct(p) { return Math.round(p * 100) + '%'; }
  function typeStat(stats, type) {
    return (stats.byType && stats.byType[type]) || { total: 0, known: 0, progress: 0 };
  }
  function refreshStatsLive() {
    if (!statsRefs) return;
    const stats = UX.getStatistics();
    Object.keys(statsRefs.types).forEach(function (type) {
      const t = typeStat(stats, type);
      statsRefs.types[type].fill.style.width = pct(t.progress);
      statsRefs.types[type].text.textContent = t.known + ' / ' + t.total + ' (' + pct(t.progress) + ')';
    });
    statsRefs.overallFill.style.width = pct(stats.overall.progress);
    statsRefs.overallPct.textContent = pct(stats.overall.progress);
    statsRefs.overallText.textContent = stats.overall.known + ' / ' + stats.overall.total;
    statsRefs.reviewHead.textContent = 'Words to review (' + stats.reviewWords.length + ')';
    renderReviewInto(statsRefs.reviewListEl, stats);
  }

  function statLabel(type) {
    return type === 'vocabulary' ? 'Vocabulary progress' : sectionMeta(type).label;
  }

  /* ================= Statistics ================= */
  function renderStatistics() {
    route = { screen: 'statistics' };
    clear(el.screen);
    const stats = UX.getStatistics();

    el.screen.appendChild(h('header', { class: 'app-header' }, [h('h1', { class: 'title-lg', text: 'Statistics' })]));

    const statsGrid = h('div', { class: 'stats-cards-grid' });

    // One card per content type, in the order SECTION_META declares
    // (Vocabulary, Synonyms & Antonyms, Idioms & Phrasal Verbs,
    // Derivatives). Each type is counted on its own, so one never dilutes
    // another.
    const typeRefs = {};
    Object.keys(SECTION_META).forEach(function (type) {
      const t = typeStat(stats, type);
      const card = h('div', { class: 'card stats-card stats-card-' + type + ' ' + sectionMeta(type).className });
      const text = h('span', { class: 'stats-value', text: t.known + ' / ' + t.total + ' (' + pct(t.progress) + ')' });
      card.appendChild(h('div', { class: 'stats-row' }, [
        h('span', { class: 'text-muted', text: statLabel(type) }),
        text
      ]));
      const bar = h('div', { class: 'progress-bar' });
      const fill = h('div', { class: 'progress-fill' });
      fill.style.width = pct(t.progress);
      bar.appendChild(fill);
      card.appendChild(bar);
      statsGrid.appendChild(card);
      typeRefs[type] = { fill: fill, text: text };
    });

    // Overall — every section type combined (unchanged from before).
    const overallCard = h('div', { class: 'card stats-card stats-card-overall' });
    const overallPct = h('span', { class: 'stats-value', text: pct(stats.overall.progress) });
    overallCard.appendChild(h('div', { class: 'stats-row' }, [
      h('span', { class: 'text-muted', text: 'Overall (all sections)' }),
      overallPct
    ]));
    const overallBar = h('div', { class: 'progress-bar' });
    const overallFill = h('div', { class: 'progress-fill' });
    overallFill.style.width = pct(stats.overall.progress);
    overallBar.appendChild(overallFill);
    overallCard.appendChild(overallBar);
    const overallText = h('span', { class: 'stats-value', text: stats.overall.known + ' / ' + stats.overall.total });
    overallCard.appendChild(h('div', { class: 'stats-row' }, [
      h('span', { class: 'text-muted', text: 'Learned' }),
      overallText
    ]));
    statsGrid.appendChild(overallCard);
    el.screen.appendChild(statsGrid);

    const reviewHead = h('h2', { class: 'section-title-flat' }, [
      icon('flag'), h('span', { text: 'Words to review (' + stats.reviewWords.length + ')' })
    ]);
    el.screen.appendChild(reviewHead);
    const reviewListEl = h('div', { class: 'review-list' });
    renderReviewInto(reviewListEl, stats);
    el.screen.appendChild(reviewListEl);

    statsRefs = {
      types: typeRefs,
      overallFill: overallFill, overallPct: overallPct, overallText: overallText,
      reviewHead: reviewHead.querySelector('span:last-child'),
      reviewListEl: reviewListEl
    };

    showNav('statistics');
  }

  /* ================= Quiz ================= */
  const RESULT_ICONS = { correct: 'check', near: 'equal-approximately', wrong: 'x', skipped: 'minus' };
  // Feedback after each answer. It confirms how the answer was judged but
  // never prints the correct word — the exam stays "blind" until the end.
  const FEEDBACK = {
    correct: { text: 'Correct' },
    near: { text: 'Almost \u2014 counted as half a point' },
    wrong: { text: 'Not quite' },
    skipped: { text: 'Skipped' }
  };
  const FEEDBACK_DELAY_MS = { correct: 450, near: 850, wrong: 850, skipped: 450 };
  let lastTimerState = 'normal';

  function renderQuiz() {
    route = { screen: 'quiz' };
    clear(el.screen);
    const quiz = UX.getCurrentQuiz();
    if (!quiz) { renderHome(); return; }
    lastTimerState = 'normal';

    el.screen.appendChild(h('header', { class: 'quiz-top' }, [
      h('button', {
        class: 'icon-btn quiz-close', 'aria-label': 'Cancel quiz',
        onclick: function () { if (confirm('Cancel this quiz?')) { UX.abortQuiz(); renderHome(); } }
      }, [icon('x')]),
      h('div', { class: 'quiz-progress' }, [
        h('div', { class: 'quiz-progress-text' }, [
          h('span', { class: 'quiz-progress-now', id: 'quiz-counter-now', text: '1' }),
          h('span', { class: 'quiz-progress-total', text: ' / ' + quiz.total })
        ]),
        h('div', { class: 'quiz-progress-bar' }, [h('div', { class: 'quiz-progress-fill', id: 'quiz-progress-fill' })])
      ]),
      h('div', { class: 'quiz-timer', id: 'quiz-timer', role: 'timer', 'aria-label': 'Time left' }, [
        icon('timer'), h('span', { id: 'quiz-timer-text', text: QE.formatClock(quiz.timeLeft) })
      ])
    ]));
    el.screen.appendChild(h('div', { class: 'quiz-timebar', 'aria-hidden': 'true' }, [h('div', { class: 'quiz-timebar-fill', id: 'quiz-timebar-fill' })]));
    el.screen.appendChild(h('div', { class: 'visually-hidden', id: 'quiz-announce', 'aria-live': 'polite' }));
    el.screen.appendChild(h('div', { class: 'quiz-body', id: 'quiz-body' }));
    updateQuizTimer({ timeLeft: quiz.timeLeft, timeLimit: quiz.timeLimit, state: quiz.timerState });
    renderQuizQuestion();
    showNav('home');
  }

  function renderQuizQuestion() {
    const body = document.getElementById('quiz-body');
    if (!body) return;
    clear(body);
    const quiz = UX.getCurrentQuiz();
    if (!quiz || !quiz.question) return;

    const now = document.getElementById('quiz-counter-now');
    const fill = document.getElementById('quiz-progress-fill');
    if (now) now.textContent = String(quiz.index + 1);
    if (fill) fill.style.width = Math.round((quiz.index / quiz.total) * 100) + '%';

    body.appendChild(h('section', { class: 'card quiz-card quiz-enter' }, [
      h('div', { class: 'quiz-card-label', text: 'Type the English word' }),
      h('div', { class: 'quiz-meaning', dir: 'auto', text: quiz.question.meaning })
    ]));

    const input = h('input', {
      type: 'text', class: 'quiz-input', dir: 'ltr', placeholder: 'Your answer',
      autocomplete: 'off', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false',
      enterkeyhint: 'done', 'aria-label': 'Your answer'
    });
    const feedback = h('div', { class: 'quiz-feedback', id: 'quiz-feedback', role: 'status', 'aria-live': 'polite' });
    body.appendChild(h('div', { class: 'quiz-answer' }, [input, feedback]));

    const skipBtn = h('button', { type: 'button', class: 'btn btn-secondary quiz-btn quiz-btn-skip' }, [icon('skip-forward'), h('span', { text: 'Skip' })]);
    const submitBtn = h('button', { type: 'button', class: 'btn btn-primary quiz-btn quiz-btn-submit' }, [icon('check'), h('span', { text: 'Submit' })]);
    // Pressing a button must not pull focus off the field — on a phone that
    // would close and reopen the keyboard on every question.
    [skipBtn, submitBtn].forEach(function (b) { b.addEventListener('pointerdown', function (e) { e.preventDefault(); }); });
    body.appendChild(h('div', { class: 'quiz-actions' }, [skipBtn, submitBtn]));

    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doSubmit(); } });
    skipBtn.addEventListener('click', doSkip);
    submitBtn.addEventListener('click', doSubmit);
    setTimeout(function () { if (document.body.contains(input)) input.focus(); }, 30);

    let locked = false;
    function lock(result) {
      locked = true;
      input.readOnly = true; // readOnly (not disabled) keeps focus, so the keyboard stays open
      submitBtn.disabled = true;
      skipBtn.disabled = true;
      input.classList.add('answered', 'answered-' + result);
      feedback.className = 'quiz-feedback quiz-feedback-' + result + ' is-shown';
      clear(feedback);
      feedback.appendChild(icon(RESULT_ICONS[result]));
      feedback.appendChild(h('span', { text: FEEDBACK[result].text }));
      setTimeout(function () {
        const next = UX.nextQuizQuestion();
        if (next) renderQuizQuestion();
      }, FEEDBACK_DELAY_MS[result]);
    }
    function doSubmit() {
      if (locked) return;
      const result = UX.submitQuizAnswer(input.value);
      if (result) lock(result);
    }
    function doSkip() {
      if (locked) return;
      const result = UX.skipQuizQuestion();
      if (result) lock(result);
    }
  }

  // Near-expiry: the clock and the thin time bar change color as the limit
  // approaches (warning, then critical); only the critical state pulses, and
  // only gently. The state is decided by the engine, not here.
  function updateQuizTimer(p) {
    const text = document.getElementById('quiz-timer-text');
    const wrap = document.getElementById('quiz-timer');
    const bar = document.getElementById('quiz-timebar-fill');
    if (!text) return;
    text.textContent = QE.formatClock(p.timeLeft);
    if (wrap) {
      wrap.classList.toggle('timer-warning', p.state === 'warning');
      wrap.classList.toggle('timer-critical', p.state === 'critical');
    }
    if (bar) {
      bar.style.width = Math.max(0, Math.min(100, (p.timeLeft / p.timeLimit) * 100)) + '%';
      bar.setAttribute('data-state', p.state);
    }
    if (p.state !== lastTimerState) {
      lastTimerState = p.state;
      const say = document.getElementById('quiz-announce');
      if (say && p.state !== 'normal') say.textContent = p.state === 'critical' ? 'Time is almost up.' : 'Time is running low.';
    }
  }

  /* ---------------- Result view (shared) ----------------
     The same view shows a quiz that just finished AND any past quiz opened
     from Quiz History — both are the same self-contained record. */
  function contextLabel(record) {
    const r = record.ref || {};
    if (r.unit == null) return 'Vocabulary quiz';
    return 'Unit ' + r.unit + (r.lessonKey ? ' \u00B7 Lesson ' + r.lessonKey : '');
  }
  function modeLabel(record) { return (QE.MODES[record.mode] || QE.MODES.full).label; }
  function dateLabel(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) + ' \u00B7 ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  function rangeLabel(record) {
    return record.estimatedRange ? QE.formatRange(record.estimatedRange.min, record.estimatedRange.max) : '\u2014';
  }
  function pointsText(n) { return n > 0 ? '+' + QE.formatScore(n) : '0'; }

  function renderQuizResultView(record) {
    const view = h('div', { class: 'quiz-result' });

    // 1) The result, at a glance.
    const hero = h('section', { class: 'card result-hero' }, [
      h('div', { class: 'result-hero-label', text: 'Score' }),
      h('div', { class: 'result-score', 'aria-label': 'Score ' + QE.formatScore(record.score) + ' out of ' + QE.formatScore(record.maxScore) }, [
        h('span', { class: 'result-score-value', text: QE.formatScore(record.score) }),
        h('span', { class: 'result-score-max', text: ' / ' + QE.formatScore(record.maxScore) })
      ]),
      h('div', { class: 'result-percent' }, [
        h('span', { class: 'result-percent-label', text: 'Percentage' }),
        h('span', { class: 'result-percent-value', text: QE.formatPercent(record.percentage) })
      ]),
      h('div', { class: 'result-bar', 'aria-hidden': 'true' }, [h('div', { class: 'result-bar-fill', style: 'width:' + Math.max(0, Math.min(100, record.percentage)) + '%' })])
    ]);
    if (record.timedOut) hero.appendChild(h('div', { class: 'result-timedout' }, [icon('clock'), h('span', { text: 'Time ran out' })]));
    view.appendChild(hero);

    // 2) Four compact categories.
    const cats = h('div', { class: 'result-cats' });
    QE.CATEGORIES.forEach(function (c) {
      cats.appendChild(h('div', { class: 'result-cat result-cat-' + c }, [
        h('span', { class: 'result-cat-icon' }, [icon(RESULT_ICONS[c])]),
        h('span', { class: 'result-cat-label', text: QE.LABELS[c] }),
        h('span', { class: 'result-cat-value', text: String(record[c]) })
      ]));
    });
    view.appendChild(cats);

    // 3) Everything else lives behind one control.
    const panel = h('div', { class: 'result-details', id: 'result-details-' + record.id });
    panel.hidden = true;
    let built = false;
    const toggle = h('button', {
      type: 'button', class: 'details-toggle', 'aria-expanded': 'false', 'aria-controls': panel.id,
      onclick: function () {
        const open = panel.hidden;
        panel.hidden = !open;
        toggle.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open && !built) { built = true; buildDetails(panel, record); }
      }
    }, [
      icon('list-checks', 'details-toggle-icon'),
      h('span', { class: 'details-toggle-label', text: 'Advanced Details' }),
      icon('chevron-down', 'details-chevron')
    ]);
    view.appendChild(toggle);
    view.appendChild(panel);
    return view;
  }

  function buildDetails(panel, record) {
    const answered = record.correct + record.near + record.wrong; // skipped questions are not "answered"
    const stats = [
      ['Exact score', QE.formatScore(record.score)],
      ['Maximum score', QE.formatScore(record.maxScore)],
      ['Percentage', QE.formatPercent(record.percentage)],
      ['Accuracy (answered)', answered > 0 ? QE.formatPercent((record.score / answered) * 100) : '\u2014'],
      ['Correct', String(record.correct)],
      ['Near Miss', String(record.near)],
      ['Wrong', String(record.wrong)],
      ['Skipped', String(record.skipped)],
      ['Time spent', record.durationSeconds != null ? QE.formatClock(record.durationSeconds) : '\u2014'],
      ['Estimated time', rangeLabel(record)],
      ['Time limit', record.timeLimit != null ? QE.formatClock(record.timeLimit) : '\u2014']
    ];
    const dl = h('dl', { class: 'details-grid' });
    stats.forEach(function (r) {
      dl.appendChild(h('div', { class: 'details-item' }, [h('dt', { text: r[0] }), h('dd', { text: r[1] })]));
    });
    panel.appendChild(dl);

    panel.appendChild(h('h3', { class: 'details-subtitle', text: 'Question breakdown' }));
    if (!record.answers.length) {
      panel.appendChild(h('p', { class: 'empty-note', text: 'Question details were not saved for this quiz.' }));
      return;
    }
    const filters = h('div', { class: 'details-filters', role: 'group', 'aria-label': 'Filter questions' });
    const list = h('div', { class: 'qd-list' });
    let active = 'all';
    const defs = [{ key: 'all', label: 'All', n: record.answers.length }].concat(QE.CATEGORIES.map(function (c) {
      return { key: c, label: QE.LABELS[c], n: record[c] };
    }));
    function drawList() {
      clear(list);
      const rows = record.answers.filter(function (a) { return active === 'all' || a.result === active; });
      if (!rows.length) { list.appendChild(h('p', { class: 'empty-note', text: 'Nothing here.' })); return; }
      rows.forEach(function (a) {
        const main = [
          h('span', { class: 'qd-expected', text: a.expected }),
          h('span', { class: 'qd-prompt', dir: 'auto', text: a.prompt })
        ];
        if (a.userAnswer && a.result !== 'correct') main.push(h('span', { class: 'qd-yours' }, [h('span', { class: 'text-muted', text: 'You wrote: ' }), a.userAnswer]));
        list.appendChild(h('div', { class: 'qd-row qd-' + a.result }, [
          h('span', { class: 'qd-badge', title: QE.LABELS[a.result], 'aria-label': QE.LABELS[a.result] }, [icon(RESULT_ICONS[a.result])]),
          h('div', { class: 'qd-main' }, main),
          h('span', { class: 'qd-points', text: pointsText(a.score) })
        ]));
      });
    }
    defs.forEach(function (d) {
      const b = h('button', {
        type: 'button', class: 'details-filter' + (d.key === active ? ' active' : ''),
        'aria-pressed': d.key === active ? 'true' : 'false',
        onclick: function () {
          active = d.key;
          filters.querySelectorAll('.details-filter').forEach(function (x) {
            const on = x.dataset.key === active;
            x.classList.toggle('active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          drawList();
        }
      }, [h('span', { text: d.label }), h('span', { class: 'details-filter-count', text: String(d.n) })]);
      b.dataset.key = d.key;
      if (d.key !== 'all' && d.n === 0) b.classList.add('is-empty');
      filters.appendChild(b);
    });
    panel.appendChild(filters);
    panel.appendChild(list);
    drawList();
  }

  function renderQuizFinished(record) {
    route = { screen: 'quiz-result' };
    clear(el.screen);
    el.screen.appendChild(h('header', { class: 'app-header' }, [
      h('div', {}, [
        h('h1', { class: 'title-lg', text: 'Quiz results' }),
        h('p', { class: 'text-muted', text: modeLabel(record) + ' \u00B7 ' + contextLabel(record) })
      ])
    ]));
    el.screen.appendChild(renderQuizResultView(record));
    el.screen.appendChild(h('div', { class: 'result-actions' }, [
      h('button', { class: 'btn btn-primary', onclick: renderHome }, [icon('house'), h('span', { text: 'Back to home' })]),
      h('button', { class: 'btn btn-secondary', onclick: renderHistory }, [icon('history'), h('span', { text: 'Quiz History' })])
    ]));
    showNav('home');
  }

  /* ================= Quiz History (its own tab) ================= */
  function renderHistoryItem(rec) {
    const counts = h('div', { class: 'qh-counts' });
    QE.CATEGORIES.forEach(function (c) {
      counts.appendChild(h('span', { class: 'qh-count qh-count-' + c, title: QE.LABELS[c] + ': ' + rec[c], 'aria-label': QE.LABELS[c] + ' ' + rec[c] }, [icon(RESULT_ICONS[c]), h('span', { text: String(rec[c]) })]));
    });
    return h('button', {
      type: 'button', class: 'qh-item',
      'aria-label': modeLabel(rec) + ', ' + contextLabel(rec) + ', score ' + QE.formatScore(rec.score) + ' of ' + QE.formatScore(rec.maxScore),
      onclick: function () { renderQuizDetail(rec.id); }
    }, [
      h('div', { class: 'qh-top' }, [
        h('div', { class: 'qh-title' }, [
          h('span', { class: 'qh-mode', text: modeLabel(rec) }),
          h('span', { class: 'qh-context', text: contextLabel(rec) })
        ]),
        h('div', { class: 'qh-score' }, [
          h('span', { class: 'qh-score-value', text: QE.formatScore(rec.score) }),
          h('span', { class: 'qh-score-max', text: ' / ' + QE.formatScore(rec.maxScore) })
        ])
      ]),
      h('div', { class: 'qh-meta' }, [
        h('span', { class: 'qh-pct', text: QE.formatPercent(rec.percentage) }),
        h('span', { class: 'qh-dot', text: '\u00B7', 'aria-hidden': 'true' }),
        h('span', { class: 'qh-duration' }, [icon('timer'), h('span', { text: rec.durationSeconds != null ? QE.formatClock(rec.durationSeconds) : '\u2014' })]),
        h('span', { class: 'qh-date', text: dateLabel(rec.ts) })
      ]),
      counts,
      icon('chevron-right', 'qh-chevron')
    ]);
  }

  function renderHistory() {
    route = { screen: 'history' };
    clear(el.screen);
    el.screen.appendChild(h('header', { class: 'app-header' }, [
      h('div', {}, [
        h('h1', { class: 'title-lg', text: 'Quiz History' }),
        h('p', { class: 'text-muted', text: 'Your last 40 quizzes, newest first' })
      ])
    ]));
    const records = UX.getQuizHistory().reverse();
    if (!records.length) {
      el.screen.appendChild(h('div', { class: 'card history-empty' }, [
        icon('history', 'history-empty-icon'),
        h('p', { class: 'empty-note', text: 'No quizzes yet. Finish a quiz and it will appear here.' })
      ]));
    } else {
      const list = h('div', { class: 'quiz-history-list' });
      records.forEach(function (rec) { list.appendChild(renderHistoryItem(rec)); });
      el.screen.appendChild(list);
    }
    showNav('history');
  }

  // Reopening a past quiz — same view as right after finishing it.
  function renderQuizDetail(recordId) {
    const record = UX.getQuizRecord(recordId);
    if (!record) { renderHistory(); return; }
    route = { screen: 'quiz-detail' };
    clear(el.screen);
    el.screen.appendChild(h('header', { class: 'app-header' }, [
      h('button', { class: 'icon-btn back-btn', 'aria-label': 'Back to Quiz History', onclick: renderHistory }, [icon('arrow-left')]),
      h('div', {}, [
        h('h1', { class: 'title-lg', text: modeLabel(record) }),
        h('p', { class: 'text-muted', text: contextLabel(record) + ' \u00B7 ' + dateLabel(record.ts) })
      ])
    ]));
    el.screen.appendChild(renderQuizResultView(record));
    showNav('history');
  }

  /* ================= Info =================
     Part-of-speech reference + a small footer credit. */
  function renderInfo() {
    route = { screen: 'info' };
    clear(el.screen);
    const page = h('div', { class: 'info-page' });
    page.appendChild(h('header', { class: 'app-header' }, [h('h1', { class: 'title-lg', text: 'Info' })]));

    const card = h('section', { class: 'card info-card' });
    card.appendChild(h('h2', { class: 'info-card-title', text: 'Parts of speech' }));
    card.appendChild(h('p', { class: 'text-muted info-card-intro', text: 'Every word has a tag such as n. or v. next to it. It tells you what job the word does in a sentence. Each tag has its own color.' }));
    const list = h('ul', { class: 'pos-list' });
    POS_INFO.forEach(function (p) {
      const cat = p.tag === 'other' ? 'other' : posCategory(p.tag);
      const body = [
        h('div', { class: 'pos-item-name', text: p.name }),
        h('p', { class: 'pos-item-text', text: p.text })
      ];
      if (p.example) body.push(h('p', { class: 'pos-item-example' }, [h('span', { class: 'text-muted', text: 'Examples: ' }), p.example]));
      list.appendChild(h('li', { class: 'pos-item' }, [
        h('span', { class: 'pos-badge pos-' + cat + ' pos-badge-lg', text: p.tag === 'other' ? 'Other' : p.tag.charAt(0).toUpperCase() + p.tag.slice(1) }),
        h('div', { class: 'pos-item-body' }, body)
      ]));
    });
    card.appendChild(list);
    card.appendChild(h('p', { class: 'text-muted pos-note', text: 'Some words have two tags separated by a slash, such as n./v. That means the word can work as either one.' }));
    page.appendChild(card);

    page.appendChild(h('footer', { class: 'info-footer' }, [
      h('p', { class: 'info-credit', text: 'Created by Mouhammed & Anas' }),
      h('p', { class: 'info-copyright', text: '\u00A9 2026 E.English. All rights reserved.' })
    ]));
    el.screen.appendChild(page);
    showNav('info');
  }

  /* ================= Navigation / boot ================= */
  function navigateToWord(wordId) {
    const loc = UX.resolveWordLocation(wordId);
    if (loc) renderLesson(loc.unit, loc.lessonKey, { focusWordId: wordId });
  }

  function init() {
    el.screen = document.getElementById('screen-container');
    el.nav = document.getElementById('bottom-nav');
    el.sideNav = document.getElementById('side-nav');
    el.themeBtn = document.getElementById('theme-toggle-btn');

    wireNav(el.nav);
    wireNav(el.sideNav);

    // Theme: applied at boot from the persisted preference (light / dark /
    // system), then driven by the 'theme-changed' event. UX emits that event
    // on every preference change AND, while the preference is 'system',
    // whenever the OS/browser theme flips — no reload needed.
    applyTheme(UX.getTheme());
    applyThemeColor(UX.getThemeColor());
    if (el.themeBtn) {
      el.themeBtn.addEventListener('click', function () {
        const pref = UX.getThemePreference();
        UX.setTheme(THEME_CYCLE[(THEME_CYCLE.indexOf(pref) + 1) % THEME_CYCLE.length]);
      });
    }
    UX.on('theme-preference-changed', syncThemeButton);
    UX.on('theme-changed', applyTheme);
    UX.on('theme-color-changed', applyThemeColor);

    UX.on('content-ready', renderHome);
    UX.on('content-load-blocked', renderLoadBlocked);

    // Live updates: patch only the DOM affected by this change — never a
    // full-screen rebuild — so scroll position, open/closed groups, and
    // input focus are never disturbed by toggling a checkbox.
    UX.on('state-changed', function () {
      if (route.screen === 'lesson') refreshWordStates();
      else if (route.screen === 'statistics') refreshStatsLive();
    });
    // Import / delete-all replace the whole learning state: redraw whatever
    // screen is open from the new state (Settings redraws itself).
    function rerenderCurrent() {
      if (route.screen === 'lesson') renderLesson(route.unit, route.lessonKey);
      else if (route.screen === 'statistics') renderStatistics();
      else if (route.screen === 'history') renderHistory();
      else if (route.screen === 'unit') renderUnit(route.unit);
    }
    UX.on('data-imported', rerenderCurrent);
    UX.on('data-reset', rerenderCurrent);

    UX.on('quiz-tick', updateQuizTimer);
    UX.on('quiz-finished', renderQuizFinished);
    UX.on('search-results', renderSearchResults);

    renderSkeleton();
    UX.loadAll();
  }

  global.UI = {
    init: init,
    renderHome: renderHome,
    renderInfo: renderInfo,
    posCategory: posCategory,
    posInfo: POS_INFO,
    renderUnit: renderUnit,
    renderLesson: renderLesson,
    renderStatistics: renderStatistics,
    renderHistory: renderHistory,
    renderQuizDetail: renderQuizDetail,
    renderQuiz: renderQuiz,
    navigateToWord: navigateToWord,
    showNav: showNav,
    // Lets the other screen modules (Settings, README) tell the router which
    // screen is open, so live-refresh handlers never redraw a different one.
    setRoute: function (r) { route = r; }
  };
})(window);
