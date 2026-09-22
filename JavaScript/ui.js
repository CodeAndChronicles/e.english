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

  const el = { screen: null, nav: null };
  let currentScreen = 'home';

  function showNav(active) {
    if (!el.nav) return;
    el.nav.hidden = false;
    el.nav.querySelectorAll('.nav-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.nav === active);
    });
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

  /* ---------------- Section metadata (icons + labels only — presentation) ---------------- */
  const SECTION_META = {
    vocabulary: { label: 'Vocabulary', icon: 'lucide:book-open', className: 'sec-vocabulary' },
    idioms: { label: 'Idioms', icon: 'lucide:quote', className: 'sec-idioms' },
    synonyms_antonyms: { label: 'Synonyms & Antonyms', icon: 'lucide:repeat', className: 'sec-synonyms' }
  };
  function sectionMeta(type) {
    return SECTION_META[type] || { label: type, icon: 'lucide:file-text', className: 'sec-generic' };
  }

  /* ================= Skeleton ================= */
  function renderSkeleton() {
    currentScreen = 'skeleton';
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
    currentScreen = 'load-blocked';
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
    currentScreen = 'home';
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
    currentScreen = 'unit';
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
    currentScreen = 'lesson';
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

    const sectionsWrap = h('div', { class: 'sections-wrap' });
    lesson.sections.forEach(function (section) {
      const meta = sectionMeta(section.type);
      const wordCount = section.groups.reduce(function (a, g) { return a + g.words.length; }, 0);

      const card = h('section', { class: 'section-card ' + meta.className });
      card.appendChild(h('div', { class: 'section-card-head' }, [
        h('span', { class: 'section-icon-badge' }, [icon(meta.icon)]),
        h('div', { class: 'section-head-text' }, [
          h('h2', { class: 'section-title', text: meta.label }),
          h('span', { class: 'section-count', text: wordCount + ' كلمة' })
        ])
      ]));

      if (section.type === 'vocabulary') {
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
    info.appendChild(h('div', { class: 'word-top' }, [
      h('span', { class: 'word-text', text: w.word }),
      h('span', {
        class: 'diff-badge ' + (w.status === 'easy' ? 'diff-easy' : 'diff-hard')
      }, [icon(w.status === 'easy' ? 'lucide:check-circle' : 'lucide:alert-triangle'), h('span', { text: w.status === 'easy' ? 'سهل' : 'صعب' })])
    ]));
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
  }

  /* ================= Statistics ================= */
  function renderStatistics() {
    currentScreen = 'statistics';
    clear(el.screen);
    const stats = UX.getStatistics();

    el.screen.appendChild(h('header', { class: 'app-header' }, [h('h1', { class: 'title-lg', text: 'Statistics' })]));

    const progressCard = h('div', { class: 'card' });
    progressCard.appendChild(h('div', { class: 'stats-row' }, [
      h('span', { class: 'text-muted', text: 'التقدّم' }),
      h('span', { class: 'stats-value', text: Math.round(stats.progress * 100) + '%' })
    ]));
    const bar = h('div', { class: 'progress-bar' });
    const fill = h('div', { class: 'progress-fill' });
    fill.style.width = Math.round(stats.progress * 100) + '%';
    bar.appendChild(fill);
    progressCard.appendChild(bar);
    progressCard.appendChild(h('div', { class: 'stats-row' }, [
      h('span', { class: 'text-muted', text: 'محفوظ' }),
      h('span', { class: 'stats-value', text: stats.knownCount + ' / ' + stats.totalWords })
    ]));
    el.screen.appendChild(progressCard);

    el.screen.appendChild(h('h2', { class: 'section-title-flat' }, [
      icon('lucide:flag'), h('span', { text: 'كلمات محتاجة مراجعة (' + stats.reviewWords.length + ')' })
    ]));
    if (!stats.reviewWords.length) {
      el.screen.appendChild(h('p', { class: 'empty-note', text: 'مفيش حاجة محتاجة مراجعة. تمام كده!' }));
    } else {
      const list = h('div', { class: 'review-list' });
      stats.reviewWords.forEach(function (r) {
        list.appendChild(h('button', { class: 'result-row review-row', onclick: function () { navigateToWord(r.wordId); } }, [
          icon(sectionMeta(r.type).icon, 'result-icon'),
          h('div', { class: 'result-text' }, [
            h('span', { class: 'result-word', text: r.word }),
            h('span', { class: 'result-meaning', text: r.meaning })
          ]),
          h('span', { class: 'result-loc', text: 'U' + r.unit + ' · L' + r.lessons.join('-') })
        ]));
      });
      el.screen.appendChild(list);
    }

    el.screen.appendChild(h('h2', { class: 'section-title-flat' }, [icon('lucide:history'), h('span', { text: 'آخر الكويزات' })]));
    if (!stats.recentQuizzes.length) {
      el.screen.appendChild(h('p', { class: 'empty-note', text: 'مفيش كويزات لسه.' }));
    } else {
      const qList = h('div', { class: 'quiz-history-list' });
      stats.recentQuizzes.forEach(function (q) {
        qList.appendChild(h('div', { class: 'quiz-history-item' }, [
          h('span', { class: 'qh-mode', text: q.mode }),
          h('span', { class: 'qh-stat qh-correct' }, [icon('lucide:check'), h('span', { text: String(q.correct) })]),
          h('span', { class: 'qh-stat qh-wrong' }, [icon('lucide:x'), h('span', { text: String(q.wrong) })]),
          h('span', { class: 'qh-stat qh-skipped' }, [icon('lucide:minus'), h('span', { text: String(q.skipped) })])
        ]));
      });
      el.screen.appendChild(qList);
    }
    showNav('statistics');
  }

  /* ================= Quiz ================= */
  function renderQuiz() {
    currentScreen = 'quiz';
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
    const feedback = h('div', { class: 'quiz-feedback', id: 'quiz-feedback' });
    body.appendChild(feedback);

    const actions = h('div', { class: 'quiz-actions' });
    actions.appendChild(h('button', { class: 'btn btn-primary', onclick: function () { doSubmit(input.value); } }, [h('span', { text: 'Submit' })]));
    actions.appendChild(h('button', { class: 'btn btn-secondary', onclick: doSkip }, [h('span', { text: 'Skip' })]));
    body.appendChild(actions);

    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); doSubmit(input.value); } });
    setTimeout(function () { input.focus(); }, 30);

    let locked = false;
    function doSubmit(value) {
      if (locked) return;
      locked = true;
      const result = UX.submitQuizAnswer(value);
      showFeedback(result, current.word);
      setTimeout(function () { const next = UX.nextQuizQuestion(); if (next) renderQuizQuestion(); }, 900);
    }
    function doSkip() {
      if (locked) return;
      locked = true;
      UX.skipQuizQuestion();
      showFeedback('skipped', current.word);
      setTimeout(function () { const next = UX.nextQuizQuestion(); if (next) renderQuizQuestion(); }, 700);
    }
  }

  function showFeedback(result, correctWord) {
    const fb = document.getElementById('quiz-feedback');
    if (!fb) return;
    clear(fb);
    fb.className = 'quiz-feedback feedback-' + result;
    const map = {
      correct: ['lucide:check-circle', 'صحيح'],
      close: ['lucide:alert-circle', 'قريب — الإجابة: ' + correctWord],
      wrong: ['lucide:x-circle', 'خطأ — الإجابة: ' + correctWord],
      skipped: ['lucide:skip-forward', 'اتخطى — الإجابة: ' + correctWord]
    };
    const m = map[result] || map.wrong;
    fb.appendChild(icon(m[0]));
    fb.appendChild(h('span', { text: m[1] }));
  }

  function updateQuizTimer(payload) {
    const timerText = document.getElementById('quiz-timer-text');
    const timerWrap = document.getElementById('quiz-timer');
    if (!timerText) return;
    timerText.textContent = formatTime(payload.timeLeft);
    if (timerWrap) timerWrap.classList.toggle('low-time', payload.timeLeft <= 30);
  }

  function renderQuizFinished(summary) {
    currentScreen = 'quiz-result';
    clear(el.screen);
    el.screen.appendChild(h('header', { class: 'app-header' }, [h('h1', { class: 'title-lg', text: 'نتيجة الكويز' })]));
    const card = h('div', { class: 'card result-card' });
    const rows = [
      ['result-total', 'lucide:list', 'الإجمالي', summary.total],
      ['result-correct', 'lucide:check-circle', 'صح', summary.correct],
      ['result-wrong', 'lucide:x-circle', 'غلط', summary.wrong],
      ['result-skipped', 'lucide:skip-forward', 'اتخطى', summary.skipped]
    ];
    rows.forEach(function (r) {
      card.appendChild(h('div', { class: 'result-row ' + r[0] }, [
        h('span', { class: 'result-label' }, [icon(r[1]), h('span', { text: r[2] })]),
        h('span', { class: 'result-value', text: String(r[3]) })
      ]));
    });
    if (summary.timedOut) card.appendChild(h('div', { class: 'result-timedout' }, [icon('lucide:clock'), h('span', { text: 'خلص الوقت' })]));
    el.screen.appendChild(card);
    el.screen.appendChild(h('button', { class: 'btn btn-primary', onclick: renderHome }, [h('span', { text: 'رجوع للرئيسية' })]));
    showNav('home');
  }

  /* ================= Navigation / boot ================= */
  function navigateToWord(wordId) {
    const loc = UX.resolveWordLocation(wordId);
    if (loc) renderLesson(loc.unit, loc.lessonKey, { focusWordId: wordId });
  }

  function init() {
    el.screen = document.getElementById('screen-container');
    el.nav = document.getElementById('bottom-nav');

    if (el.nav) {
      el.nav.querySelectorAll('.nav-btn').forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.dataset.nav === 'home') renderHome();
          else if (b.dataset.nav === 'statistics') renderStatistics();
        });
      });
    }

    UX.on('content-ready', renderHome);
    UX.on('content-load-blocked', renderLoadBlocked);
    UX.on('state-changed', function () {
      if (currentScreen === 'lesson' || currentScreen === 'unit') refreshWordStates();
      else if (currentScreen === 'statistics') renderStatistics();
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
