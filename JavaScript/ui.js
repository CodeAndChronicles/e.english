/* ui.js — Presentation layer only. NO business logic, NO direct localStorage.
   Everything here reads/writes state exclusively through window.UX.
   Merged from ui-screens.js + ui-quiz.js + ui-nav.js and redesigned with
   Iconify icons, collapsible groups, and a cleaner visual hierarchy — the
   underlying UX calls are unchanged. */
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
    return h('iconify-icon', { icon: name, class: 'icon' + (extraClass ? ' ' + extraClass : '') });
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function formatTime(sec) {
    if (sec < 0) sec = 0;
    const m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  const el = { screen: null, nav: null, themeBtn: null };
  let route = { screen: 'home' };
  let lessonProgressRef = null; // { unit, lessonKey, fillEl, textEl } — live-updated, not rebuilt
  let statsRefs = null; // live-updatable stats DOM refs, set by renderStatistics()

  function showNav(active) {
    if (!el.nav) return;
    el.nav.hidden = false;
    el.nav.querySelectorAll('.nav-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.nav === active);
    });
  }

  /* ---------------- Theme ---------------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (el.themeBtn) {
      const ic = el.themeBtn.querySelector('iconify-icon');
      // Icon shows the action available (switch-to), not the current state.
      if (ic) ic.setAttribute('icon', theme === 'dark' ? 'lucide:sun' : 'lucide:moon');
      el.themeBtn.setAttribute('aria-label', theme === 'dark' ? 'التبديل للـ Light Mode' : 'التبديل للـ Dark Mode');
    }
  }
  // Accent color family (green/blue/gray/red) — fully independent from
  // light/dark; see CSS/root.css combined [data-color][data-theme] blocks
  // and CSS/settings.css for the picker UI.
  function applyThemeColor(color) {
    document.documentElement.setAttribute('data-color', color);
  }

  /* Custom checkbox: hidden native input (for real change events + a11y)
     plus a styled box with check/minus Iconify icons toggled by CSS
     (:checked / :indeterminate), per "checkbox state must be obvious". */
  function customCheckbox(opts) {
    const input = h('input', { type: 'checkbox', class: 'cb-input visually-hidden' });
    if (opts.checked) input.checked = true;
    if (opts.onchange) input.addEventListener('change', function () { opts.onchange(input.checked); });
    const box = h('span', { class: 'cb-box' }, [
      icon('lucide:check', 'cb-icon-checked'),
      icon('lucide:minus', 'cb-icon-indeterminate')
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
    vocabulary: { label: 'Vocabulary', icon: 'lucide:book-open', className: 'sec-vocabulary' },
    idioms: { label: 'Idioms & Phrasal Verbs', icon: 'lucide:quote', className: 'sec-idioms' },
    synonyms_antonyms: { label: 'Synonyms & Antonyms', icon: 'lucide:repeat', className: 'sec-synonyms' },
    derivatives: { label: 'Derivatives', icon: 'lucide:git-branch', className: 'sec-derivatives' }
  };
  function sectionMeta(type) {
    return SECTION_META[type] || { label: type, icon: 'lucide:file-text', className: 'sec-generic' };
  }

  /* ================= Skeleton ================= */
  function renderSkeleton() {
    route = { screen: 'skeleton' };
    clear(el.screen);
    if (el.nav) el.nav.hidden = true;
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
    if (el.nav) el.nav.hidden = true;
    const wrap = h('div', { class: 'card blocked-card' }, [
      icon('lucide:server-off', 'blocked-icon'),
      h('h1', { class: 'title-lg', text: 'محتاج تشغّل الموقع من سيرفر محلي' }),
      h('p', { class: 'text-muted', text: 'المتصفح بيمنع قراءة ملفات Files/*.md مباشرة لما تفتح index.html بدبل كليك.' }),
      h('ol', { class: 'blocked-steps' }, [
        h('li', { text: 'لو عندك VS Code: نزّل إضافة Live Server، وافتح index.html بيها.' }),
        h('li', { text: 'أو افتح Terminal في مجلد المشروع واكتب: python -m http.server 8000' }),
        h('li', { text: 'بعدين افتح المتصفح على http://localhost:8000' })
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
        h('p', { class: 'text-muted', text: 'اختار وحدة عشان تبدأ المذاكرة' })
      ])
    ]));

    const searchBox = h('div', { class: 'search-box' });
    searchBox.appendChild(icon('lucide:search', 'search-icon'));
    const searchInput = h('input', { type: 'text', class: 'search-input', placeholder: 'ابحث عن كلمة...' });
    searchInput.addEventListener('input', function () { UX.search(searchInput.value); });
    searchBox.appendChild(searchInput);
    el.screen.appendChild(searchBox);
    el.screen.appendChild(h('div', { class: 'search-results', id: 'search-results' }));

    const list = h('div', { class: 'card-grid' });
    if (!units.length) {
      list.appendChild(h('p', { class: 'empty-note', text: 'مفيش محتوى متاح دلوقتي.' }));
    } else {
      units.forEach(function (unit) {
        list.appendChild(h('button', { class: 'nav-card', onclick: function () { renderUnit(unit.unit); } }, [
          icon('lucide:layers', 'nav-card-icon'),
          h('div', { class: 'nav-card-text' }, [
            h('div', { class: 'nav-card-title', text: 'Unit ' + unit.unit }),
            h('div', { class: 'nav-card-sub', text: unit.lessons.length + ' مجموعة دروس' })
          ]),
          icon('lucide:chevron-left', 'nav-card-chevron')
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
    container.appendChild(h('div', { class: 'search-results-head', text: results.length + ' نتيجة' }));
    results.forEach(function (r) {
      container.appendChild(h('button', { class: 'result-row', onclick: function () { navigateToWord(r.wordId); } }, [
        icon(sectionMeta(r.type).icon, 'result-icon'),
        h('div', { class: 'result-text' }, [
          h('span', { class: 'result-word', text: r.word }),
          h('span', { class: 'result-meaning', text: r.meaning })
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
      h('button', { class: 'icon-btn back-btn', onclick: renderHome }, [icon('lucide:arrow-right')]),
      h('h1', { class: 'title-lg', text: 'Unit ' + unitNum })
    ]));

    const list = h('div', { class: 'card-grid' });
    unit.lessons.forEach(function (lesson) {
      const key = lesson.lessons.join('-');
      list.appendChild(h('button', { class: 'nav-card', onclick: function () { renderLesson(unitNum, key); } }, [
        icon('lucide:book', 'nav-card-icon'),
        h('div', { class: 'nav-card-text' }, [
          h('div', { class: 'nav-card-title', text: 'Lesson ' + lesson.lessons.join('-') }),
          h('div', { class: 'nav-card-sub', text: lesson.sections.length + ' قسم' })
        ]),
        icon('lucide:chevron-left', 'nav-card-chevron')
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
      h('button', { class: 'icon-btn back-btn', onclick: function () { renderUnit(unitNum); } }, [icon('lucide:arrow-right')]),
      h('h1', { class: 'title-lg', text: 'Unit ' + unitNum + ' · Lesson ' + lessonKey })
    ]));

    const groupOfFocus = opts.focusWordId ? findGroupIndexForWord(lesson, opts.focusWordId) : null;
    lessonProgressRef = null;

    const sectionsWrap = h('div', { class: 'sections-wrap' });

    // Sections whose file failed to load (per app.json) get a visible
    // warning card instead of silently disappearing.
    UX.getMissingSections().forEach(function (m) {
      if (m.unit !== unitNum || m.lessons.join('-') !== lessonKey) return;
      const meta = sectionMeta(m.type);
      sectionsWrap.appendChild(h('section', { class: 'section-card section-missing' }, [
        h('div', { class: 'section-card-head' }, [
          h('span', { class: 'section-icon-badge section-icon-warning' }, [icon('lucide:alert-triangle')]),
          h('div', { class: 'section-head-text' }, [
            h('h2', { class: 'section-title', text: meta.label }),
            h('span', { class: 'section-count text-warning', text: 'لم يتم تحميل ملف هذا القسم' })
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
        h('span', { class: 'section-count', text: wordCount + ' كلمة' })
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
        row.appendChild(h('button', {
          class: 'btn btn-primary',
          onclick: function () { if (UX.startFullQuiz(unitNum, lessonKey)) renderQuiz(); }
        }, [icon('lucide:pencil-line'), h('span', { text: 'Full Quiz · 30 د' })]));
        row.appendChild(h('button', {
          class: 'btn btn-secondary' + (canSelected ? '' : ' is-disabled'),
          disabled: !canSelected,
          onclick: function () { if (canSelected && UX.startSelectedQuiz(unitNum, lessonKey)) renderQuiz(); }
        }, [icon('lucide:star'), h('span', { text: 'Selected Quiz · 15 د' })]));
        card.appendChild(row);
        if (!canSelected) {
          card.appendChild(h('p', { class: 'hint-note', text: 'علّم كلمات كـ "محفوظة" الأول عشان تقدر تعمل Selected Quiz.' }));
        }
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

    const toggleBtn = h('button', { class: 'group-toggle', 'aria-expanded': forceOpen ? 'true' : 'false' }, [
      icon('lucide:chevron-left', 'group-chevron')
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

  /* ================= Word ================= */
  function renderWord(w) {
    const row = h('div', { class: 'word-row', 'data-word-id': w.wordId });

    const cb = customCheckbox({
      checked: UX.isKnown(w.wordId),
      extraClass: 'word-cb',
      onchange: function () { UX.toggleKnown(w.wordId); }
    });
    row.appendChild(cb);

    const info = h('div', { class: 'word-info' });
    const wordTopChildren = [h('span', { class: 'word-text', text: w.word })];
    if (w.pos) wordTopChildren.push(h('span', { class: 'pos-badge', text: w.pos }));
    wordTopChildren.push(h('span', {
      class: 'diff-badge ' + (w.status === 'easy' ? 'diff-easy' : 'diff-hard')
    }, [icon(w.status === 'easy' ? 'lucide:check-circle' : 'lucide:alert-triangle'), h('span', { text: w.status === 'easy' ? 'سهل' : 'صعب' })]));
    info.appendChild(h('div', { class: 'word-top' }, wordTopChildren));
    info.appendChild(h('div', { class: 'word-meaning', text: w.meaning }));

    const extrasKeys = Object.keys(w.extras || {}).filter(function (k) { return k !== '_raw'; });
    if (extrasKeys.length) {
      const chips = h('div', { class: 'extras-row' });
      extrasKeys.forEach(function (k) {
        if (!w.extras[k]) return;
        const isSyn = /syn/i.test(k);
        chips.appendChild(h('span', { class: 'extra-chip' }, [
          icon(isSyn ? 'lucide:plus-circle' : 'lucide:minus-circle', 'extra-chip-icon'),
          h('span', { text: w.extras[k] })
        ]));
      });
      if (chips.childNodes.length) info.appendChild(chips);
    } else if (w.extras && w.extras._raw && w.extras._raw.length) {
      info.appendChild(h('div', { class: 'word-extras-raw', text: w.extras._raw.join(' · ') }));
    }
    row.appendChild(info);

    row.appendChild(h('button', {
      class: 'flag-btn' + (UX.isManualReview(w.wordId) ? ' active' : ''),
      title: 'علّم للمراجعة',
      onclick: function () { UX.toggleManualReview(w.wordId); }
    }, [icon('lucide:flag')]));

    return row;
  }

  function refreshWordStates() {
    document.querySelectorAll('.word-row').forEach(function (row) {
      const id = row.dataset.wordId;
      const cb = row.querySelector('.cb-input');
      if (cb) cb.checked = UX.isKnown(id);
      const flag = row.querySelector('.flag-btn');
      if (flag) flag.classList.toggle('active', UX.isManualReview(id));
    });
    document.querySelectorAll('.group').forEach(function (g) {
      const wordIds = [];
      g.querySelectorAll('.word-row').forEach(function (r) { wordIds.push(r.dataset.wordId); });
      const cb = g.querySelector('.group-cb .cb-input');
      if (cb) applyTriState(cb, UX.getGroupTriState(wordIds));
      const countEl = g.querySelector('.group-count');
      if (countEl) {
        const known = wordIds.filter(function (id) { return UX.isKnown(id); }).length;
        countEl.textContent = known + '/' + wordIds.length;
      }
    });
    refreshLessonProgress();
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
      container.appendChild(h('p', { class: 'empty-note', text: 'مفيش حاجة محتاجة مراجعة. تمام كده!' }));
    } else {
      stats.reviewWords.forEach(function (r) {
        container.appendChild(h('button', { class: 'result-row review-row', onclick: function () { navigateToWord(r.wordId); } }, [
          icon(sectionMeta(r.type).icon, 'result-icon'),
          h('div', { class: 'result-text' }, [
            h('span', { class: 'result-word', text: r.word }),
            h('span', { class: 'result-meaning', text: r.meaning })
          ]),
          h('span', { class: 'result-loc', text: 'U' + r.unit + ' · L' + r.lessons.join('-') })
        ]));
      });
    }
  }

  // Statistics screen: patch just the numbers/lists that changed instead
  // of clearing and rebuilding the whole screen (keeps scroll position).
  function refreshStatsLive() {
    if (!statsRefs) return;
    const stats = UX.getStatistics();
    statsRefs.vocabFill.style.width = Math.round(stats.vocabulary.progress * 100) + '%';
    statsRefs.vocabText.textContent = stats.vocabulary.known + ' / ' + stats.vocabulary.total + ' (' + Math.round(stats.vocabulary.progress * 100) + '%)';
    statsRefs.overallFill.style.width = Math.round(stats.overall.progress * 100) + '%';
    statsRefs.overallText.textContent = stats.overall.known + ' / ' + stats.overall.total;
    statsRefs.reviewHead.textContent = 'كلمات محتاجة مراجعة (' + stats.reviewWords.length + ')';
    renderReviewInto(statsRefs.reviewListEl, stats);
  }

  /* ================= Statistics ================= */
  function renderStatistics() {
    route = { screen: 'statistics' };
    clear(el.screen);
    const stats = UX.getStatistics();

    el.screen.appendChild(h('header', { class: 'app-header' }, [h('h1', { class: 'title-lg', text: 'Statistics' })]));

    // Vocabulary progress — separate from overall/global study stats so
    // Synonyms/Idioms/Derivatives never dilute this percentage.
    const vocabCard = h('div', { class: 'card' });
    const vocabText = h('span', { class: 'stats-value', text: stats.vocabulary.known + ' / ' + stats.vocabulary.total + ' (' + Math.round(stats.vocabulary.progress * 100) + '%)' });
    vocabCard.appendChild(h('div', { class: 'stats-row' }, [
      h('span', { class: 'text-muted', text: 'تقدّم المفردات (Vocabulary)' }),
      vocabText
    ]));
    const vocabBar = h('div', { class: 'progress-bar' });
    const vocabFill = h('div', { class: 'progress-fill' });
    vocabFill.style.width = Math.round(stats.vocabulary.progress * 100) + '%';
    vocabBar.appendChild(vocabFill);
    vocabCard.appendChild(vocabBar);
    el.screen.appendChild(vocabCard);

    // Overall/global — every section type combined (used for a general
    // sense of study activity, intentionally not called "Vocabulary").
    const overallCard = h('div', { class: 'card' });
    overallCard.appendChild(h('div', { class: 'stats-row' }, [
      h('span', { class: 'text-muted', text: 'كل المحتوى (كل الأقسام)' }),
      h('span', { class: 'stats-value', text: Math.round(stats.overall.progress * 100) + '%' })
    ]));
    const overallBar = h('div', { class: 'progress-bar' });
    const overallFill = h('div', { class: 'progress-fill' });
    overallFill.style.width = Math.round(stats.overall.progress * 100) + '%';
    overallBar.appendChild(overallFill);
    overallCard.appendChild(overallBar);
    const overallText = h('span', { class: 'stats-value', text: stats.overall.known + ' / ' + stats.overall.total });
    overallCard.appendChild(h('div', { class: 'stats-row' }, [
      h('span', { class: 'text-muted', text: 'محفوظ' }),
      overallText
    ]));
    el.screen.appendChild(overallCard);

    const reviewHead = h('h2', { class: 'section-title-flat' }, [
      icon('lucide:flag'), h('span', { text: 'كلمات محتاجة مراجعة (' + stats.reviewWords.length + ')' })
    ]);
    el.screen.appendChild(reviewHead);
    const reviewListEl = h('div', { class: 'review-list' });
    renderReviewInto(reviewListEl, stats);
    el.screen.appendChild(reviewListEl);

    statsRefs = {
      vocabFill: vocabFill, vocabText: vocabText,
      overallFill: overallFill, overallText: overallText,
      reviewHead: reviewHead.querySelector('span:last-child'),
      reviewListEl: reviewListEl
    };

    el.screen.appendChild(h('h2', { class: 'section-title-flat' }, [icon('lucide:history'), h('span', { text: 'آخر الكويزات' })]));
    if (!stats.recentQuizzes.length) {
      el.screen.appendChild(h('p', { class: 'empty-note', text: 'مفيش كويزات لسه.' }));
    } else {
      const qList = h('div', { class: 'quiz-history-list' });
      stats.recentQuizzes.forEach(function (q) {
        qList.appendChild(h('button', { class: 'quiz-history-item', onclick: function () { renderQuizDetail(q.id); } }, [
          h('span', { class: 'qh-mode', text: q.mode }),
          h('span', { class: 'qh-stat qh-correct' }, [icon('lucide:check'), h('span', { text: String(q.correct) })]),
          h('span', { class: 'qh-stat qh-wrong' }, [icon('lucide:x'), h('span', { text: String(q.wrong) })]),
          h('span', { class: 'qh-stat qh-skipped' }, [icon('lucide:minus'), h('span', { text: String(q.skipped) })]),
          icon('lucide:chevron-left', 'nav-card-chevron')
        ]));
      });
      el.screen.appendChild(qList);
    }
    showNav('statistics');
  }

  /* ================= Quiz ================= */
  function renderQuiz() {
    route = { screen: 'quiz' };
    clear(el.screen);
    const quiz = UX.getCurrentQuiz();
    if (!quiz) { renderHome(); return; }

    el.screen.appendChild(h('header', { class: 'app-header quiz-header' }, [
      h('button', {
        class: 'icon-btn', onclick: function () {
          if (confirm('عايز تلغي الكويز؟')) { UX.abortQuiz(); renderHome(); }
        }
      }, [icon('lucide:x')]),
      h('div', { class: 'quiz-timer', id: 'quiz-timer' }, [icon('lucide:clock'), h('span', { id: 'quiz-timer-text', text: formatTime(quiz.timeLeft) })])
    ]));
    el.screen.appendChild(h('div', { class: 'quiz-body', id: 'quiz-body' }));
    renderQuizQuestion();
    showNav('home');
  }

  function renderQuizQuestion() {
    const body = document.getElementById('quiz-body');
    if (!body) return;
    clear(body);
    const q = UX.getCurrentQuiz();
    if (!q) return;
    const current = q.words[q.index];
    if (!current) return;

    body.appendChild(h('div', { class: 'quiz-counter', text: (q.index + 1) + ' / ' + q.words.length }));
    body.appendChild(h('div', { class: 'quiz-prompt card' }, [
      h('div', { class: 'text-muted', text: 'اكتب الكلمة بالإنجليزي' }),
      h('div', { class: 'quiz-meaning', text: current.meaning })
    ]));

    const input = h('input', { type: 'text', class: 'quiz-input', placeholder: 'Your answer...', autocomplete: 'off', spellcheck: 'false' });
    body.appendChild(input);
    // A quiet dot — confirms the answer registered without ever printing
    // the correct word during the exam (see doSubmit/doSkip below). The
    // full breakdown only appears on the results screen after the quiz ends.
    const pulse = h('div', { class: 'quiz-pulse', id: 'quiz-pulse' });
    body.appendChild(pulse);

    const actions = h('div', { class: 'quiz-actions' });
    const submitBtn = h('button', { class: 'btn btn-primary', onclick: function () { doSubmit(input.value); } }, [h('span', { text: 'Submit' })]);
    const skipBtn = h('button', { class: 'btn btn-secondary', onclick: doSkip }, [h('span', { text: 'Skip' })]);
    actions.appendChild(submitBtn);
    actions.appendChild(skipBtn);
    body.appendChild(actions);

    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doSubmit(input.value); } });
    setTimeout(function () { input.focus(); }, 30);

    let locked = false;
    function lockUI(result) {
      locked = true;
      input.disabled = true;
      submitBtn.disabled = true;
      skipBtn.disabled = true;
      input.classList.add('answered', 'answered-' + result);
      pulse.className = 'quiz-pulse quiz-pulse-' + result;
    }
    function doSubmit(value) {
      if (locked) return;
      const result = UX.submitQuizAnswer(value);
      lockUI(result);
      setTimeout(function () { const next = UX.nextQuizQuestion(); if (next) renderQuizQuestion(); }, 380);
    }
    function doSkip() {
      if (locked) return;
      UX.skipQuizQuestion();
      lockUI('skipped');
      setTimeout(function () { const next = UX.nextQuizQuestion(); if (next) renderQuizQuestion(); }, 320);
    }
  }

  function updateQuizTimer(payload) {
    const timerText = document.getElementById('quiz-timer-text');
    const timerWrap = document.getElementById('quiz-timer');
    if (!timerText) return;
    timerText.textContent = formatTime(payload.timeLeft);
    if (timerWrap) timerWrap.classList.toggle('low-time', payload.timeLeft <= 30);
  }

  // Shared by the just-finished quiz screen AND by reopening any past quiz
  // from the Statistics history list — same record shape either way, so
  // exactly what you got wrong/skipped is always one look away.
  function renderQuizResultCard(record) {
    const card = h('div', { class: 'card result-card' });
    const rows = [
      ['result-total', 'lucide:list', 'الإجمالي', record.total],
      ['result-correct', 'lucide:check-circle', 'صح', record.correct],
      ['result-wrong', 'lucide:x-circle', 'غلط', record.wrong],
      ['result-skipped', 'lucide:skip-forward', 'اتخطى', record.skipped]
    ];
    rows.forEach(function (r) {
      card.appendChild(h('div', { class: 'result-row ' + r[0] }, [
        h('span', { class: 'result-label' }, [icon(r[1]), h('span', { text: r[2] })]),
        h('span', { class: 'result-value', text: String(r[3]) })
      ]));
    });
    if (record.timedOut) card.appendChild(h('div', { class: 'result-timedout' }, [icon('lucide:clock'), h('span', { text: 'خلص الوقت' })]));
    return card;
  }

  function renderAnswerListInto(container, records, resultKind, emptyText) {
    clear(container);
    const filtered = (records || []).filter(function (a) { return a.result === resultKind; });
    if (!filtered.length) {
      container.appendChild(h('p', { class: 'empty-note', text: emptyText }));
      return;
    }
    filtered.forEach(function (a) {
      const rowChildren = [
        h('div', { class: 'result-text' }, [
          h('span', { class: 'result-word', text: a.correctWord }),
          h('span', { class: 'result-meaning', text: a.meaning || '' })
        ])
      ];
      if (resultKind === 'wrong' && a.userAnswer) {
        rowChildren.push(h('span', { class: 'answer-you-wrote', text: a.userAnswer }));
      }
      container.appendChild(h('div', { class: 'result-row answer-review-row' }, rowChildren));
    });
  }

  function renderQuizBreakdown(container, record) {
    clear(container);
    container.appendChild(h('h2', { class: 'section-title-flat breakdown-wrong' }, [icon('lucide:x-circle'), h('span', { text: 'الكلمات الغلط (' + record.wrong + ')' })]));
    const wrongList = h('div', { class: 'review-list' });
    renderAnswerListInto(wrongList, record.answers, 'wrong', 'مفيش غلط — كله تمام 🎉');
    container.appendChild(wrongList);

    container.appendChild(h('h2', { class: 'section-title-flat breakdown-skipped' }, [icon('lucide:skip-forward'), h('span', { text: 'الكلمات المتخطاة (' + record.skipped + ')' })]));
    const skippedList = h('div', { class: 'review-list' });
    renderAnswerListInto(skippedList, record.answers, 'skipped', 'مفيش كلمات اتخطيتها.');
    container.appendChild(skippedList);
  }

  function renderQuizFinished(record) {
    route = { screen: 'quiz-result' };
    clear(el.screen);
    el.screen.appendChild(h('header', { class: 'app-header' }, [h('h1', { class: 'title-lg', text: 'نتيجة الكويز' })]));
    el.screen.appendChild(renderQuizResultCard(record));
    const breakdown = h('div', { class: 'quiz-breakdown' });
    renderQuizBreakdown(breakdown, record);
    el.screen.appendChild(breakdown);
    el.screen.appendChild(h('button', { class: 'btn btn-primary', onclick: renderHome }, [h('span', { text: 'رجوع للرئيسية' })]));
    showNav('home');
  }

  /* ================= Quiz detail (reopening a past quiz from history) ================= */
  function renderQuizDetail(recordId) {
    const record = UX.getQuizRecord(recordId);
    if (!record) { renderStatistics(); return; }
    route = { screen: 'quiz-detail' };
    clear(el.screen);
    const d = new Date(record.ts);
    const dateStr = d.toLocaleDateString('ar-EG') + ' · ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    el.screen.appendChild(h('header', { class: 'app-header' }, [
      h('button', { class: 'icon-btn back-btn', onclick: renderStatistics }, [icon('lucide:arrow-right')]),
      h('div', {}, [
        h('h1', { class: 'title-lg', text: record.mode === 'selected' ? 'Selected Quiz' : 'Full Quiz' }),
        h('p', { class: 'text-muted', text: dateStr })
      ])
    ]));
    el.screen.appendChild(renderQuizResultCard(record));
    const breakdown = h('div', { class: 'quiz-breakdown' });
    renderQuizBreakdown(breakdown, record);
    el.screen.appendChild(breakdown);
    showNav('statistics');
  }

  /* ================= Navigation / boot ================= */
  function navigateToWord(wordId) {
    const loc = UX.resolveWordLocation(wordId);
    if (loc) renderLesson(loc.unit, loc.lessonKey, { focusWordId: wordId });
  }

  function init() {
    el.screen = document.getElementById('screen-container');
    el.nav = document.getElementById('bottom-nav');
    el.themeBtn = document.getElementById('theme-toggle-btn');

    if (el.nav) {
      el.nav.querySelectorAll('.nav-btn').forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.dataset.nav === 'home') renderHome();
          else if (b.dataset.nav === 'statistics') renderStatistics();
          // 'settings' is implemented in JavaScript/settings.js (loaded
          // after this file) which attaches UI.renderSettings — resolved
          // dynamically here so load order between the two doesn't matter.
          else if (b.dataset.nav === 'settings' && global.UI && global.UI.renderSettings) global.UI.renderSettings();
        });
      });
    }

    // Theme: applied once at boot, then fully driven by the toggle + the
    // 'theme-changed' event — never re-derived from the OS after that.
    applyTheme(UX.getTheme());
    applyThemeColor(UX.getThemeColor());
    if (el.themeBtn) {
      el.themeBtn.addEventListener('click', function () {
        UX.setTheme(UX.getTheme() === 'dark' ? 'light' : 'dark');
      });
    }
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

    UX.on('quiz-tick', updateQuizTimer);
    UX.on('quiz-finished', renderQuizFinished);
    UX.on('search-results', renderSearchResults);

    renderSkeleton();
    UX.loadAll();
  }

  global.UI = {
    init: init,
    renderHome: renderHome,
    renderUnit: renderUnit,
    renderLesson: renderLesson,
    renderStatistics: renderStatistics,
    renderQuiz: renderQuiz,
    navigateToWord: navigateToWord
  };
})(window);
