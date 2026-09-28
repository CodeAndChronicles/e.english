/* ux.js — Pure logic / state / behavior layer. NO DOM access.
   Merged from the previous ux-state.js + ux-content.js + ux-quiz.js —
   the LOGIC below is unchanged from the verified version; only the
   file split was removed per the current UI/UX-only reorganization pass. */
(function (global) {
  'use strict';

  /* ---------------- Event Bus ---------------- */
  const listeners = {};
  function on(eventName, cb) {
    if (!listeners[eventName]) listeners[eventName] = [];
    listeners[eventName].push(cb);
  }
  function emit(eventName, data) {
    const arr = listeners[eventName];
    if (!arr) return;
    for (let i = 0; i < arr.length; i++) {
      try { arr[i](data); } catch (e) { console.error(e); }
    }
  }

  /* ---------------- Storage Keys ---------------- */
  const LS_KEYS = {
    known: 'eenglish.known',
    manualReview: 'eenglish.manualReview',
    autoReview: 'eenglish.autoReview',
    quizHistory: 'eenglish.quizHistory',
    theme: 'eenglish.theme',
    themeColor: 'eenglish.themeColor',
    keepAwake: 'eenglish.keepAwake'
  };
  const THEME_COLORS = ['green', 'blue', 'gray', 'red', 'purple', 'lemon'];

  function readLS(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }
  function writeLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* ---------------- State ---------------- */
  const state = {
    units: [],
    known: readLS(LS_KEYS.known, {}),
    manualReview: readLS(LS_KEYS.manualReview, {}),
    autoReview: readLS(LS_KEYS.autoReview, {}),
    quizHistory: readLS(LS_KEYS.quizHistory, []),
    currentScreen: 'home',
    quiz: null,
    searchIndex: [],
    lastSearchQuery: '',
    // Sections whose file was listed in app.json but failed to load —
    // kept so the UI can show "this section didn't load" instead of
    // just silently omitting it (parsed from the filename itself, which
    // doesn't require the fetch to have succeeded).
    missingSections: [],
    theme: readLS(LS_KEYS.theme, null), // null = no explicit user choice yet
    themeColor: readLS(LS_KEYS.themeColor, 'green'),
    keepAwake: readLS(LS_KEYS.keepAwake, false)
  };

  /* ---------------- Word ID ----------------
     Data Contract: a word's identity is (unit, lesson-pair, section type,
     the word text itself) — NEVER its group index or position inside the
     file. This is what "نقل الكلمة أو تغيير ترتيبها" needs: you can move a
     word to a different group, or reorder groups/words freely in the .md
     file, and its saved progress (known / review / quiz history) stays
     attached to it. Only renaming the word text, or moving it to a
     different unit/lesson/section, creates a "new" word — which is
     correct, since at that point it IS a different vocabulary entry.
     Duplicate words inside the same unit/lesson/section (rare) are
     disambiguated with a stable occurrence counter based on first-seen
     order, tracked per-doc by buildUnits below. */
  function slugifyWord(word) {
    return String(word || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'w';
  }
  function makeWordId(doc, occurrenceIndex, word) {
    const base = 'u' + doc.unit + '_l' + doc.lessons.join('-') + '_' + doc.type + '_' + slugifyWord(word);
    return occurrenceIndex > 0 ? base + '-' + (occurrenceIndex + 1) : base;
  }

  /* ---------------- Filename Parser ----------------
     Current/expected format — ONE file per unit+lesson-pair, containing
     every section (Vocabulary, Synonyms & Antonyms, Idioms, Derivatives...)
     inside it, split by "## " headers (see parseMultiSectionMd):
       U{UNIT}-L{LESSON1}(-{LESSON2})?.md
     A legacy single-section-per-file name (old v3 layout) is still
     recognized so nothing breaks if one is left in Files/:
       U{UNIT}-L{LESSON1}(-{LESSON2})?-{TYPE}.md */
  function parseFilename(name) {
    let m = name.match(/^U(\d+)-L(\d+)(?:-(\d+))?\.md$/);
    if (m) {
      const unit = parseInt(m[1], 10);
      const l1 = parseInt(m[2], 10);
      const l2 = m[3] ? parseInt(m[3], 10) : null;
      return { unit: unit, lessons: l2 ? [l1, l2] : [l1], type: null, legacy: false };
    }
    m = name.match(/^U(\d+)-L(\d+)(?:-(\d+))?-([a-zA-Z_]+)\.md$/);
    if (m) {
      const unit = parseInt(m[1], 10);
      const l1 = parseInt(m[2], 10);
      const l2 = m[3] ? parseInt(m[3], 10) : null;
      return { unit: unit, lessons: l2 ? [l1, l2] : [l1], type: m[4], legacy: true };
    }
    return null;
  }

  /* ---------------- Section type normalization ----------------
     Maps a "## Section Title" heading (Arabic or English, any of the
     synonyms below) to the internal type key the rest of the app already
     keys off of (SECTION_META in ui.js). Anything unrecognized still
     works — it just falls back to a slug of the title itself, and ui.js's
     sectionMeta() shows it with a generic icon/label instead of a
     specifically-styled one. */
  const SECTION_TYPE_ALIASES = {
    vocabulary: ['vocabulary', 'vocab', 'المفردات', 'مفردات'],
    synonyms_antonyms: ['synonyms & antonyms', 'synonyms and antonyms', 'synonyms_antonyms', 'synonyms-antonyms', 'synonyms antonyms', 'مرادفات ومتضادات', 'مرادفات وأضداد', 'المرادفات والمتضادات'],
    idioms: ['idioms', 'idioms & phrasal verbs', 'idioms and phrasal verbs', 'التعبيرات', 'المصطلحات', 'العبارات الاصطلاحية'],
    derivatives: ['derivatives', 'المشتقات']
  };
  function normalizeHeadingKey(title) {
    return String(title || '').toLowerCase().trim().replace(/\s+/g, ' ');
  }
  function normalizeSectionType(title) {
    const key = normalizeHeadingKey(title);
    for (const type in SECTION_TYPE_ALIASES) {
      if (SECTION_TYPE_ALIASES[type].indexOf(key) !== -1) return type;
    }
    const slug = key.replace(/[^a-z0-9\u0600-\u06FF]+/g, '_').replace(/^_+|_+$/g, '');
    return slug || 'section';
  }

  /* ---------------- MD Parser (multi-section: current format) ----------------
     "## Section Title"  -> starts a new section (Vocabulary / Synonyms &
       Antonyms / Idioms / Derivatives / ...), in the order they appear.
     "@fields: A, B"     -> extra columns for the CURRENT section only,
       reset at every new "## " section header.
     any other "#..." heading (###, ##### ...) -> starts a new Group
       inside the current section — unchanged from before.
     🟢 / 🔴 word lines  -> unchanged from before (see README). */
  function parseMultiSectionMd(content, meta) {
    const lines = content.split(/\r?\n/);
    const sections = [];
    let section = null; // { type, fields, groups }
    let currentGroup = null;

    function ensureSection() {
      if (!section) {
        section = { type: 'vocabulary', fields: [], groups: [] };
        sections.push(section);
      }
      return section;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (line.indexOf('@fields:') === 0) {
        const rest = line.slice('@fields:'.length).trim();
        ensureSection().fields = rest.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        continue;
      }

      const hashMatch = line.match(/^(#+)\s*(.*)$/);
      if (hashMatch) {
        const level = hashMatch[1].length;
        const title = hashMatch[2].trim();
        if (level === 2) {
          // New section.
          section = { type: normalizeSectionType(title), fields: [], groups: [] };
          sections.push(section);
          currentGroup = null;
        } else {
          // New group inside the current (or an implicit default) section.
          currentGroup = { title: title, words: [] };
          ensureSection().groups.push(currentGroup);
        }
        continue;
      }

      if (line.indexOf('🟢') === 0 || line.indexOf('🔴') === 0) {
        ensureSection();
        if (!currentGroup) {
          currentGroup = { title: '', words: [] };
          section.groups.push(currentGroup);
        }
        const status = line.indexOf('🟢') === 0 ? 'easy' : 'hard';
        const body = line.replace(/^(🟢|🔴)\s*/u, '').trim();
        const parts = body.split('|').map(function (p) { return p.trim(); });
        if (parts.length < 2) continue;
        let word = parts[0];
        const meaning = parts[1];
        const extrasArr = parts.slice(2);
        const extras = {};
        if (section.fields.length > 0) {
          for (let k = 0; k < section.fields.length; k++) {
            extras[section.fields[k]] = extrasArr[k] !== undefined ? extrasArr[k] : '';
          }
        } else {
          extras._raw = extrasArr;
        }
        // Part of speech: an optional "[pos]" tag stuck to the end of the
        // word itself, e.g. "waste [v.]" — stripped out here so `word`
        // stays clean everywhere else (ids, quiz answers, search...).
        let pos = null;
        const posMatch = word.match(/^(.*?)\s*\[([^\[\]]{1,12})\]\s*$/);
        if (posMatch) {
          word = posMatch[1].trim();
          pos = posMatch[2].trim();
        }
        currentGroup.words.push({ word: word, meaning: meaning, status: status, extras: extras, pos: pos });
      }
    }

    return sections.map(function (s) {
      return { unit: meta.unit, lessons: meta.lessons, type: s.type, fields: s.fields, groups: s.groups };
    });
  }

  /* ---------------- MD Parser (legacy: one type per file) ---------------- */
  function parseMd(content, meta) {
    return parseMultiSectionMd('## ' + meta.type + '\n' + content, meta)[0] ||
      { unit: meta.unit, lessons: meta.lessons, type: meta.type, fields: [], groups: [] };
  }

  /* ---------------- Build Units Tree ---------------- */
  function buildUnits(docs) {
    const unitMap = {};
    docs.forEach(function (doc) {
      if (!unitMap[doc.unit]) unitMap[doc.unit] = { unit: doc.unit, lessons: {} };
      const lessonsKey = doc.lessons.join('-');
      if (!unitMap[doc.unit].lessons[lessonsKey]) {
        unitMap[doc.unit].lessons[lessonsKey] = { lessons: doc.lessons, sections: [] };
      }
      // Tracks how many times each word text was already seen within this
      // one doc (unit+lessons+type), so a duplicate gets a stable "-2",
      // "-3"... suffix instead of colliding — see makeWordId above.
      const seenCount = {};
      unitMap[doc.unit].lessons[lessonsKey].sections.push({
        type: doc.type,
        fields: doc.fields,
        groups: doc.groups.map(function (g) {
          return {
            title: g.title,
            words: g.words.map(function (w) {
              const slug = slugifyWord(w.word);
              const occurrence = seenCount[slug] || 0;
              seenCount[slug] = occurrence + 1;
              return {
                word: w.word,
                meaning: w.meaning,
                status: w.status,
                extras: w.extras,
                pos: w.pos || null,
                wordId: makeWordId(doc, occurrence, w.word)
              };
            })
          };
        })
      });
    });

    const unitsArr = Object.keys(unitMap).map(function (k) {
      const u = unitMap[k];
      const lessonsArr = Object.keys(u.lessons).map(function (lk) { return u.lessons[lk]; });
      lessonsArr.sort(function (a, b) { return a.lessons[0] - b.lessons[0]; });
      return { unit: u.unit, lessons: lessonsArr };
    });
    unitsArr.sort(function (a, b) { return a.unit - b.unit; });
    return unitsArr;
  }

  /* ---------------- Build Search Index ---------------- */
  function buildSearchIndex() {
    const idx = [];
    state.units.forEach(function (unit) {
      unit.lessons.forEach(function (lesson) {
        lesson.sections.forEach(function (section) {
          section.groups.forEach(function (group, gi) {
            group.words.forEach(function (w) {
              idx.push({
                wordId: w.wordId, word: w.word, meaning: w.meaning, pos: w.pos || null,
                unit: unit.unit, lessons: lesson.lessons, type: section.type,
                groupIdx: gi, groupTitle: group.title
              });
            });
          });
        });
      });
    });
    state.searchIndex = idx;
  }

  /* ---------------- Loading ----------------
     Files are fetched in small throttled batches (not all at once) so a
     larger course (many units) doesn't spike CPU/RAM/startup time parsing
     everything in one synchronous burst — each batch yields back to the
     browser (via a microtask-friendly delay) before the next one starts. */
  const LOAD_BATCH_SIZE = 3;
  const LOAD_BATCH_DELAY_MS = 0; // yields a tick; kept as a named constant so it's easy to tune later
  function yieldTick() {
    return new Promise(function (resolve) {
      if (global.requestIdleCallback) global.requestIdleCallback(function () { resolve(); }, { timeout: 50 });
      else setTimeout(resolve, LOAD_BATCH_DELAY_MS);
    });
  }
  function fetchFilesThrottled(files) {
    const results = [];
    let i = 0;
    function nextBatch() {
      const batch = files.slice(i, i + LOAD_BATCH_SIZE);
      i += LOAD_BATCH_SIZE;
      if (!batch.length) return Promise.resolve(results);
      const tasks = batch.map(function (fname) {
        return fetch('Files/' + fname)
          .then(function (res) {
            if (!res.ok) throw new Error('missing');
            return res.text().then(function (txt) { return { fname: fname, text: txt }; });
          })
          .catch(function () {
            console.warn('[Warning] Missing content file:\nFiles/' + fname);
            const meta = parseFilename(fname);
            if (meta) state.missingSections.push({ unit: meta.unit, lessons: meta.lessons, type: meta.type, fname: fname });
            emit('content-file-missing', { fname: fname, meta: meta });
            return null;
          });
      });
      return Promise.all(tasks).then(function (batchResults) {
        results.push.apply(results, batchResults);
        emit('content-load-progress', { loaded: Math.min(i, files.length), total: files.length });
        return yieldTick().then(nextBatch);
      });
    }
    return nextBatch();
  }

  // Removes localStorage entries for words that no longer exist in the
  // currently-loaded content (renamed/deleted words, or anything left
  // over from an old wordId scheme) — "نظّف تلقائيًا أي بيانات قديمة".
  function cleanupStaleWordData() {
    const validIds = {};
    state.units.forEach(function (unit) {
      unit.lessons.forEach(function (lesson) {
        lesson.sections.forEach(function (section) {
          section.groups.forEach(function (group) {
            group.words.forEach(function (w) { validIds[w.wordId] = true; });
          });
        });
      });
    });
    let changedKnown = false, changedManual = false, changedAuto = false;
    Object.keys(state.known).forEach(function (id) { if (!validIds[id]) { delete state.known[id]; changedKnown = true; } });
    Object.keys(state.manualReview).forEach(function (id) { if (!validIds[id]) { delete state.manualReview[id]; changedManual = true; } });
    Object.keys(state.autoReview).forEach(function (id) { if (!validIds[id]) { delete state.autoReview[id]; changedAuto = true; } });
    if (changedKnown) writeLS(LS_KEYS.known, state.known);
    if (changedManual) writeLS(LS_KEYS.manualReview, state.manualReview);
    if (changedAuto) writeLS(LS_KEYS.autoReview, state.autoReview);
  }

  function loadAll() {
    // Fetching Files/*.md over file:// fails silently (CORS) in every major
    // browser. Detect that up front and tell ui.js exactly why, instead of
    // leaving the app stuck on the skeleton forever.
    if (global.location && global.location.protocol === 'file:') {
      emit('content-load-blocked', { reason: 'file-protocol' });
      return Promise.resolve();
    }

    state.missingSections = [];
    return fetch('app.json')
      .then(function (r) {
        if (!r.ok) throw new Error('app.json not found');
        return r.json();
      })
      .then(function (cfg) {
        const files = (cfg && cfg.files) || [];
        return fetchFilesThrottled(files);
      })
      .then(function (results) {
        const docs = [];
        results.forEach(function (r) {
          if (!r) return;
          const meta = parseFilename(r.fname);
          if (!meta) {
            console.warn('[Warning] Filename does not match pattern U{n}-L{n}(-{n})?.md:\n' + r.fname);
            return;
          }
          if (meta.legacy) {
            docs.push(parseMd(r.text, meta));
          } else {
            parseMultiSectionMd(r.text, meta).forEach(function (d) { docs.push(d); });
          }
        });
        state.units = buildUnits(docs);
        buildSearchIndex();
        cleanupStaleWordData();
        emit('content-ready', { units: state.units });
      })
      .catch(function (err) {
        console.error('Load failed:', err);
        state.units = [];
        emit('content-ready', { units: [] });
      });
  }

  /* ---------------- Known / Review ---------------- */
  function isKnown(wordId) { return !!state.known[wordId]; }
  function isManualReview(wordId) { return !!state.manualReview[wordId]; }
  function isAutoReview(wordId) { return !!state.autoReview[wordId]; }
  function needsReview(wordId) { return isManualReview(wordId) || isAutoReview(wordId); }

  function setKnown(wordId, val) {
    if (val) state.known[wordId] = true; else delete state.known[wordId];
    writeLS(LS_KEYS.known, state.known);
    emit('state-changed', { wordId: wordId, kind: 'known' });
  }
  function setManualReview(wordId, val) {
    if (val) state.manualReview[wordId] = true; else delete state.manualReview[wordId];
    writeLS(LS_KEYS.manualReview, state.manualReview);
    emit('state-changed', { wordId: wordId, kind: 'manualReview' });
  }
  function setAutoReview(wordId, val) {
    if (val) state.autoReview[wordId] = true; else delete state.autoReview[wordId];
    writeLS(LS_KEYS.autoReview, state.autoReview);
    emit('state-changed', { wordId: wordId, kind: 'autoReview' });
  }
  function toggleKnown(wordId) { setKnown(wordId, !isKnown(wordId)); }
  function toggleManualReview(wordId) { setManualReview(wordId, !isManualReview(wordId)); }

  function setGroupKnown(wordIds, val) {
    wordIds.forEach(function (id) { if (val) state.known[id] = true; else delete state.known[id]; });
    writeLS(LS_KEYS.known, state.known);
    emit('state-changed', { kind: 'group-known', wordIds: wordIds });
  }
  function getGroupTriState(wordIds) {
    let count = 0;
    for (let i = 0; i < wordIds.length; i++) { if (state.known[wordIds[i]]) count++; }
    if (count === 0) return 'unchecked';
    if (count === wordIds.length) return 'checked';
    return 'indeterminate';
  }

  /* ---------------- Answer Checking ---------------- */
  function normalize(s) {
    if (s == null) return '';
    let t = String(s).toLowerCase().trim();
    t = t.replace(/\s+/g, ' ');
    t = t.replace(/[.,!?;:'"`~()\[\]{}<>،؛؟]+$/g, '');
    return t;
  }
  function levenshtein(a, b) {
    if (a === b) return 0;
    const al = a.length, bl = b.length;
    if (al === 0) return bl;
    if (bl === 0) return al;
    let prev = new Array(bl + 1);
    let curr = new Array(bl + 1);
    for (let j = 0; j <= bl; j++) prev[j] = j;
    for (let i = 1; i <= al; i++) {
      curr[0] = i;
      for (let j = 1; j <= bl; j++) {
        const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      const tmp = prev; prev = curr; curr = tmp;
    }
    return prev[bl];
  }
  function thresholdFor(len) {
    if (len <= 3) return 0;
    if (len <= 5) return 1;
    if (len <= 8) return 2;
    return 3;
  }
  function checkAnswer(userAnswer, correctWord) {
    const u = normalize(userAnswer);
    const c = normalize(correctWord);
    if (u === '') return 'skipped';
    if (u === c) return 'correct';
    const dist = levenshtein(u, c);
    const maxAllowed = thresholdFor(c.length);
    if (dist <= maxAllowed) return 'close';
    return 'wrong';
  }

  /* ---------------- Quiz scoping ----------------
     Both quiz modes open from inside the current lesson's Vocabulary
     section only — never a cross-unit/global quiz. */
  const QUIZ_FULL_SECONDS = 1800;
  const QUIZ_SELECTED_SECONDS = 900;

  function collectVocabularyFor(unitNum, lessonKey) {
    const out = [];
    const unit = state.units.find(function (u) { return u.unit === unitNum; });
    if (!unit) return out;
    const lesson = unit.lessons.find(function (l) { return l.lessons.join('-') === lessonKey; });
    if (!lesson) return out;
    lesson.sections.forEach(function (section) {
      if (section.type !== 'vocabulary') return;
      section.groups.forEach(function (group, gi) {
        group.words.forEach(function (w) {
          out.push({
            wordId: w.wordId, word: w.word, meaning: w.meaning, pos: w.pos || null,
            unit: unitNum, lessons: lesson.lessons, groupIdx: gi, groupTitle: group.title
          });
        });
      });
    });
    return out;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // ~70% of the sequence is drawn from the "needs review" pool and ~30%
  // from "fresh", randomly interleaved. Every word in the pool is always
  // included exactly once — the weighting only controls draw order.
  function orderWithReviewWeighting(pool) {
    const reviewPool = shuffle(pool.filter(function (w) { return needsReview(w.wordId); }));
    const freshPool = shuffle(pool.filter(function (w) { return !needsReview(w.wordId); }));
    const ordered = [];
    let ri = 0, fi = 0;
    while (ri < reviewPool.length || fi < freshPool.length) {
      const reviewLeft = reviewPool.length - ri;
      const freshLeft = freshPool.length - fi;
      let takeReview;
      if (reviewLeft <= 0) takeReview = false;
      else if (freshLeft <= 0) takeReview = true;
      else takeReview = Math.random() < 0.7;
      if (takeReview) { ordered.push(reviewPool[ri]); ri++; }
      else { ordered.push(freshPool[fi]); fi++; }
    }
    return ordered;
  }

  function startFullQuiz(unitNum, lessonKey) {
    const pool = collectVocabularyFor(unitNum, lessonKey);
    if (pool.length === 0) return false;
    beginQuiz('full', orderWithReviewWeighting(pool), QUIZ_FULL_SECONDS, { unit: unitNum, lessonKey: lessonKey });
    return true;
  }

  function canStartSelectedQuiz(unitNum, lessonKey) {
    return collectVocabularyFor(unitNum, lessonKey).some(function (w) { return isKnown(w.wordId); });
  }

  function startSelectedQuiz(unitNum, lessonKey) {
    const pool = collectVocabularyFor(unitNum, lessonKey).filter(function (w) { return isKnown(w.wordId); });
    if (pool.length === 0) return false;
    beginQuiz('selected', orderWithReviewWeighting(pool), QUIZ_SELECTED_SECONDS, { unit: unitNum, lessonKey: lessonKey });
    return true;
  }

  function beginQuiz(mode, words, seconds, ref) {
    if (state.quiz && state.quiz.timerId) clearInterval(state.quiz.timerId);
    state.quiz = {
      mode: mode, words: words, index: 0, correct: 0, wrong: 0, skipped: 0,
      answers: [], timeLeft: seconds, timerId: null, ref: ref
    };
    emit('quiz-started', { mode: mode, total: words.length, timeLeft: seconds });
    emit('quiz-tick', { timeLeft: state.quiz.timeLeft });
    emit('quiz-question', currentQuizQuestion());

    state.quiz.timerId = setInterval(function () {
      if (!state.quiz) return;
      state.quiz.timeLeft -= 1;
      emit('quiz-tick', { timeLeft: state.quiz.timeLeft });
      if (state.quiz.timeLeft <= 0) finishQuiz(true);
    }, 1000);
  }

  function currentQuizQuestion() {
    if (!state.quiz) return null;
    const q = state.quiz.words[state.quiz.index];
    if (!q) return null;
    return { index: state.quiz.index, total: state.quiz.words.length, meaning: q.meaning };
  }

  function submitQuizAnswer(userAnswer) {
    if (!state.quiz) return null;
    const q = state.quiz.words[state.quiz.index];
    if (!q) return null;
    const result = checkAnswer(userAnswer, q.word);
    if (result === 'correct') state.quiz.correct++;
    else if (result === 'skipped') state.quiz.skipped++;
    else { state.quiz.wrong++; setAutoReview(q.wordId, true); }

    state.quiz.answers.push({ wordId: q.wordId, userAnswer: userAnswer, correctWord: q.word, meaning: q.meaning, result: result });
    // Note: no 'quiz-answer' reveal event anymore — the correct word must
    // never be shown to the user mid-exam (only after the quiz ends), so
    // ui.js no longer listens for this during an active question.
    return result;
  }

  function nextQuizQuestion() {
    if (!state.quiz) return null;
    state.quiz.index++;
    if (state.quiz.index >= state.quiz.words.length) { finishQuiz(false); return null; }
    const q = currentQuizQuestion();
    emit('quiz-question', q);
    return q;
  }

  function skipQuizQuestion() {
    if (!state.quiz) return null;
    const q = state.quiz.words[state.quiz.index];
    if (!q) return null;
    state.quiz.skipped++;
    state.quiz.answers.push({ wordId: q.wordId, userAnswer: '', correctWord: q.word, meaning: q.meaning, result: 'skipped' });
    return 'skipped';
  }

  function finishQuiz(timedOut) {
    if (!state.quiz) return;
    const q = state.quiz;
    if (q.timerId) { clearInterval(q.timerId); q.timerId = null; }
    if (timedOut) {
      for (let i = q.index; i < q.words.length; i++) {
        const w = q.words[i];
        q.skipped++;
        q.answers.push({ wordId: w.wordId, userAnswer: '', correctWord: w.word, meaning: w.meaning, result: 'skipped' });
      }
    }
    // Full per-attempt record — kept (not just the aggregate counts) so a
    // past quiz can be reopened later and show exactly which words were
    // wrong/skipped, per "كل كويز يكون مخزن عليه الغلطات والكلمات الي
    // عملتلها skip" — see UI's quiz-history list + quiz detail screen.
    const record = {
      id: 'q_' + Date.now() + '_' + Math.floor(Math.random() * 1e6),
      ts: Date.now(), mode: q.mode, ref: q.ref, total: q.words.length,
      correct: q.correct, wrong: q.wrong, skipped: q.skipped, timedOut: !!timedOut,
      answers: q.answers.slice()
    };
    state.quizHistory.push(record);
    if (state.quizHistory.length > 40) state.quizHistory = state.quizHistory.slice(-40);
    writeLS(LS_KEYS.quizHistory, state.quizHistory);

    state.quiz = null;
    emit('quiz-finished', record);
    return record;
  }

  function abortQuiz() {
    if (state.quiz && state.quiz.timerId) clearInterval(state.quiz.timerId);
    state.quiz = null;
  }

  /* ---------------- Search ---------------- */
  function debounce(fn, ms) {
    let t = null;
    return function () {
      const args = arguments;
      const self = this;
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn.apply(self, args); }, ms);
    };
  }
  const SEARCH_DEBOUNCE_MS = 300;
  const runSearch = debounce(function (query) {
    state.lastSearchQuery = query;
    const q = normalize(query);
    if (!q) { emit('search-results', { query: query, results: [] }); return; }
    const exact = [], starts = [], includes = [];
    for (let i = 0; i < state.searchIndex.length; i++) {
      const item = state.searchIndex[i];
      const w = normalize(item.word), m = normalize(item.meaning);
      if (w === q || m === q) exact.push(item);
      else if (w.indexOf(q) === 0 || m.indexOf(q) === 0) starts.push(item);
      else if (w.indexOf(q) !== -1 || m.indexOf(q) !== -1) includes.push(item);
    }
    emit('search-results', { query: query, results: exact.concat(starts, includes).slice(0, 100) });
  }, SEARCH_DEBOUNCE_MS);
  function search(query) { runSearch(query); }

  /* ---------------- Navigation Resolution ---------------- */
  function resolveWordLocation(wordId) {
    for (let ui = 0; ui < state.units.length; ui++) {
      const unit = state.units[ui];
      for (let li = 0; li < unit.lessons.length; li++) {
        const lesson = unit.lessons[li];
        for (let si = 0; si < lesson.sections.length; si++) {
          const section = lesson.sections[si];
          for (let gi = 0; gi < section.groups.length; gi++) {
            const group = section.groups[gi];
            for (let wi = 0; wi < group.words.length; wi++) {
              if (group.words[wi].wordId === wordId) {
                return { unit: unit.unit, lessonKey: lesson.lessons.join('-'), type: section.type, groupIdx: gi, wordId: wordId };
              }
            }
          }
        }
      }
    }
    return null;
  }

  /* ---------------- Statistics ----------------
     Vocabulary progress is tracked separately from overall/global study
     stats, so Synonyms/Idioms/Derivatives words never dilute the
     "Vocabulary" percentage — they're still counted in the overall
     figure, since known/review state is generic across every section type. */
  function getStatistics() {
    let vocabTotal = 0, vocabKnown = 0;
    let overallTotal = 0, overallKnown = 0;
    const reviewWords = [];
    state.units.forEach(function (unit) {
      unit.lessons.forEach(function (lesson) {
        lesson.sections.forEach(function (section) {
          section.groups.forEach(function (group, gi) {
            group.words.forEach(function (w) {
              overallTotal++;
              if (state.known[w.wordId]) overallKnown++;
              if (section.type === 'vocabulary') {
                vocabTotal++;
                if (state.known[w.wordId]) vocabKnown++;
              }
              if (state.manualReview[w.wordId] || state.autoReview[w.wordId]) {
                reviewWords.push({
                  wordId: w.wordId, word: w.word, meaning: w.meaning, pos: w.pos || null,
                  unit: unit.unit, lessons: lesson.lessons, type: section.type,
                  groupIdx: gi, groupTitle: group.title
                });
              }
            });
          });
        });
      });
    });
    const recent = state.quizHistory.slice(-10).reverse();
    return {
      vocabulary: { total: vocabTotal, known: vocabKnown, progress: vocabTotal > 0 ? vocabKnown / vocabTotal : 0 },
      overall: { total: overallTotal, known: overallKnown, progress: overallTotal > 0 ? overallKnown / overallTotal : 0 },
      reviewWords: reviewWords,
      recentQuizzes: recent
    };
  }

  // Vocabulary progress scoped to one lesson only (used for the small
  // progress indicator inside a lesson's Vocabulary section header).
  function getLessonVocabularyProgress(unitNum, lessonKey) {
    const words = collectVocabularyFor(unitNum, lessonKey);
    const known = words.filter(function (w) { return isKnown(w.wordId); }).length;
    return { total: words.length, known: known, progress: words.length > 0 ? known / words.length : 0 };
  }

  /* ---------------- Theme ---------------- */
  function getTheme() {
    if (state.theme === 'light' || state.theme === 'dark') return state.theme;
    // No explicit choice yet — fall back to the system preference just as
    // an initial default; from the first setTheme() call onward this is
    // fully user-controlled and persisted, never re-derived from the OS.
    try {
      if (global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch (e) {}
    return 'light';
  }
  function setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') return;
    state.theme = theme;
    writeLS(LS_KEYS.theme, theme);
    emit('theme-changed', theme);
  }

  /* ---------------- Theme color (Settings: 4 premium accents) ---------------- */
  function getThemeColor() {
    return THEME_COLORS.indexOf(state.themeColor) !== -1 ? state.themeColor : 'green';
  }
  function setThemeColor(color) {
    if (THEME_COLORS.indexOf(color) === -1) return;
    state.themeColor = color;
    writeLS(LS_KEYS.themeColor, color);
    emit('theme-color-changed', color);
  }

  /* ---------------- Keep screen awake (Settings) ---------------- */
  function getKeepAwake() { return !!state.keepAwake; }
  function setKeepAwake(val) {
    state.keepAwake = !!val;
    writeLS(LS_KEYS.keepAwake, state.keepAwake);
    emit('keep-awake-changed', state.keepAwake);
  }

  /* ---------------- Quiz history lookup (for the quiz-detail screen) ---------------- */
  function getQuizRecord(id) {
    for (let i = 0; i < state.quizHistory.length; i++) {
      if (state.quizHistory[i].id === id) return state.quizHistory[i];
    }
    return null;
  }

  /* ---------------- Local data: export / import / delete-all ----------------
     Everything the app stores is plain JSON in localStorage, so this is a
     straight dump/restore of the known keys — used by the Settings screen's
     "استخراج / استيراد / حذف كل البيانات" buttons. */
  function exportAllData() {
    return {
      appVersion: 1,
      exportedAt: Date.now(),
      known: state.known,
      manualReview: state.manualReview,
      autoReview: state.autoReview,
      quizHistory: state.quizHistory,
      theme: state.theme,
      themeColor: state.themeColor,
      keepAwake: state.keepAwake
    };
  }
  function importAllData(obj) {
    if (!obj || typeof obj !== 'object') return false;
    const recognized = ['known', 'manualReview', 'autoReview', 'quizHistory', 'theme', 'themeColor', 'keepAwake'];
    if (!recognized.some(function (k) { return obj[k] !== undefined; })) return false;
    try {
      if (obj.known && typeof obj.known === 'object') { state.known = obj.known; writeLS(LS_KEYS.known, state.known); }
      if (obj.manualReview && typeof obj.manualReview === 'object') { state.manualReview = obj.manualReview; writeLS(LS_KEYS.manualReview, state.manualReview); }
      if (obj.autoReview && typeof obj.autoReview === 'object') { state.autoReview = obj.autoReview; writeLS(LS_KEYS.autoReview, state.autoReview); }
      if (Array.isArray(obj.quizHistory)) { state.quizHistory = obj.quizHistory.slice(-40); writeLS(LS_KEYS.quizHistory, state.quizHistory); }
      if (obj.theme === 'light' || obj.theme === 'dark') { state.theme = obj.theme; writeLS(LS_KEYS.theme, state.theme); }
      if (THEME_COLORS.indexOf(obj.themeColor) !== -1) { state.themeColor = obj.themeColor; writeLS(LS_KEYS.themeColor, state.themeColor); }
      if (typeof obj.keepAwake === 'boolean') { state.keepAwake = obj.keepAwake; writeLS(LS_KEYS.keepAwake, state.keepAwake); }
      if (state.units && state.units.length) cleanupStaleWordData();
      emit('data-imported', {});
      return true;
    } catch (e) {
      return false;
    }
  }
  function resetAllData() {
    state.known = {};
    state.manualReview = {};
    state.autoReview = {};
    state.quizHistory = [];
    state.theme = null;
    state.themeColor = 'green';
    state.keepAwake = false;
    Object.keys(LS_KEYS).forEach(function (k) {
      try { localStorage.removeItem(LS_KEYS[k]); } catch (e) {}
    });
    emit('data-reset', {});
  }

  /* ---------------- Public API ---------------- */
  global.UX = {
    on: on, emit: emit,
    loadAll: loadAll,
    getUnits: function () { return state.units; },
    getStatistics: getStatistics,
    getLessonVocabularyProgress: getLessonVocabularyProgress,
    getMissingSections: function () { return state.missingSections.slice(); },
    getTheme: getTheme, setTheme: setTheme,
    getThemeColor: getThemeColor, setThemeColor: setThemeColor, getThemeColors: function () { return THEME_COLORS.slice(); },
    getKeepAwake: getKeepAwake, setKeepAwake: setKeepAwake,
    getQuizHistory: function () { return state.quizHistory.slice(); },
    getQuizRecord: getQuizRecord,
    exportAllData: exportAllData, importAllData: importAllData, resetAllData: resetAllData,
    isKnown: isKnown, isManualReview: isManualReview, isAutoReview: isAutoReview, needsReview: needsReview,
    toggleKnown: toggleKnown, toggleManualReview: toggleManualReview,
    setKnown: setKnown, setGroupKnown: setGroupKnown, getGroupTriState: getGroupTriState,
    checkAnswer: checkAnswer, normalize: normalize, levenshtein: levenshtein,
    startFullQuiz: startFullQuiz, startSelectedQuiz: startSelectedQuiz, canStartSelectedQuiz: canStartSelectedQuiz,
    submitQuizAnswer: submitQuizAnswer, nextQuizQuestion: nextQuizQuestion, skipQuizQuestion: skipQuizQuestion,
    finishQuiz: finishQuiz, abortQuiz: abortQuiz, getCurrentQuiz: function () { return state.quiz; },
    search: search, resolveWordLocation: resolveWordLocation
  };
})(window);
