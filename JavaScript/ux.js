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
    quizHistory: 'eenglish.quizHistory'
  };

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
    lastSearchQuery: ''
  };

  /* ---------------- Word ID ---------------- */
  function makeWordId(doc, groupIdx, wordIdx, word) {
    return (
      'u' + doc.unit +
      '_l' + doc.lessons.join('-') +
      '_' + doc.type +
      '_g' + groupIdx +
      '_w' + wordIdx + '_' + word.toLowerCase()
    );
  }

  /* ---------------- Filename Parser ----------------
     U{UNIT}-L{LESSON1}(-{LESSON2})?-{TYPE}.md */
  function parseFilename(name) {
    const m = name.match(/^U(\d+)-L(\d+)(?:-(\d+))?-([a-zA-Z_]+)\.md$/);
    if (!m) return null;
    const unit = parseInt(m[1], 10);
    const l1 = parseInt(m[2], 10);
    const l2 = m[3] ? parseInt(m[3], 10) : null;
    const type = m[4];
    const lessons = l2 ? [l1, l2] : [l1];
    return { unit: unit, lessons: lessons, type: type };
  }

  /* ---------------- MD Parser ---------------- */
  function parseMd(content, meta) {
    const lines = content.split(/\r?\n/);
    let fields = [];
    const groups = [];
    let currentGroup = null;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = raw.trim();
      if (!line) continue;

      if (line.indexOf('@fields:') === 0) {
        const rest = line.slice('@fields:'.length).trim();
        fields = rest.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        continue;
      }

      if (line.indexOf('#') === 0) {
        const title = line.replace(/^#+\s*/, '').trim();
        currentGroup = { title: title, words: [] };
        groups.push(currentGroup);
        continue;
      }

      if (line.indexOf('🟢') === 0 || line.indexOf('🔴') === 0) {
        if (!currentGroup) {
          currentGroup = { title: '', words: [] };
          groups.push(currentGroup);
        }
        const status = line.indexOf('🟢') === 0 ? 'easy' : 'hard';
        const body = line.replace(/^(🟢|🔴)\s*/u, '').trim();
        const parts = body.split('|').map(function (p) { return p.trim(); });
        if (parts.length < 2) continue;
        const word = parts[0];
        const meaning = parts[1];
        const extrasArr = parts.slice(2);
        const extras = {};
        if (fields.length > 0) {
          for (let k = 0; k < fields.length; k++) {
            extras[fields[k]] = extrasArr[k] !== undefined ? extrasArr[k] : '';
          }
        } else {
          extras._raw = extrasArr;
        }
        currentGroup.words.push({ word: word, meaning: meaning, status: status, extras: extras });
      }
    }

    return { unit: meta.unit, lessons: meta.lessons, type: meta.type, fields: fields, groups: groups };
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
      unitMap[doc.unit].lessons[lessonsKey].sections.push({
        type: doc.type,
        fields: doc.fields,
        groups: doc.groups.map(function (g, gi) {
          return {
            title: g.title,
            words: g.words.map(function (w, wi) {
              return {
                word: w.word,
                meaning: w.meaning,
                status: w.status,
                extras: w.extras,
                wordId: makeWordId(doc, gi, wi, w.word)
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
                wordId: w.wordId, word: w.word, meaning: w.meaning,
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

  /* ---------------- Loading ---------------- */
  function loadAll() {
    // Fetching Files/*.md over file:// fails silently (CORS) in every major
    // browser. Detect that up front and tell ui.js exactly why, instead of
    // leaving the app stuck on the skeleton forever.
    if (global.location && global.location.protocol === 'file:') {
      emit('content-load-blocked', { reason: 'file-protocol' });
      return Promise.resolve();
    }

    return fetch('app.json')
      .then(function (r) {
        if (!r.ok) throw new Error('app.json not found');
        return r.json();
      })
      .then(function (cfg) {
        const files = (cfg && cfg.files) || [];
        const tasks = files.map(function (fname) {
          return fetch('Files/' + fname)
            .then(function (res) {
              if (!res.ok) throw new Error('missing');
              return res.text().then(function (txt) { return { fname: fname, text: txt }; });
            })
            .catch(function () {
              console.warn('[Warning] Missing content file:\nFiles/' + fname);
              emit('content-file-missing', { fname: fname });
              return null;
            });
        });
        return Promise.all(tasks);
      })
      .then(function (results) {
        const docs = [];
        results.forEach(function (r) {
          if (!r) return;
          const meta = parseFilename(r.fname);
          if (!meta) {
            console.warn('[Warning] Filename does not match pattern U{n}-L{n}(-{n})?-{type}.md:\n' + r.fname);
            return;
          }
          docs.push(parseMd(r.text, meta));
        });
        state.units = buildUnits(docs);
        buildSearchIndex();
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
            wordId: w.wordId, word: w.word, meaning: w.meaning,
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

    state.quiz.answers.push({ wordId: q.wordId, userAnswer: userAnswer, correctWord: q.word, result: result });
    emit('quiz-answer', { result: result, correctWord: q.word, meaning: q.meaning });
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
    state.quiz.answers.push({ wordId: q.wordId, userAnswer: '', correctWord: q.word, result: 'skipped' });
    emit('quiz-answer', { result: 'skipped', correctWord: q.word, meaning: q.meaning });
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
        q.answers.push({ wordId: w.wordId, userAnswer: '', correctWord: w.word, result: 'skipped' });
      }
    }
    const summary = {
      ts: Date.now(), mode: q.mode, total: q.words.length,
      correct: q.correct, wrong: q.wrong, skipped: q.skipped, timedOut: !!timedOut
    };
    state.quizHistory.push(summary);
    if (state.quizHistory.length > 20) state.quizHistory = state.quizHistory.slice(-20);
    writeLS(LS_KEYS.quizHistory, state.quizHistory);

    state.quiz = null;
    emit('quiz-finished', summary);
    return summary;
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

  /* ---------------- Statistics ---------------- */
  function getStatistics() {
    let totalWords = 0, knownCount = 0;
    const reviewWords = [];
    state.units.forEach(function (unit) {
      unit.lessons.forEach(function (lesson) {
        lesson.sections.forEach(function (section) {
          section.groups.forEach(function (group, gi) {
            group.words.forEach(function (w) {
              totalWords++;
              if (state.known[w.wordId]) knownCount++;
              if (state.manualReview[w.wordId] || state.autoReview[w.wordId]) {
                reviewWords.push({
                  wordId: w.wordId, word: w.word, meaning: w.meaning,
                  unit: unit.unit, lessons: lesson.lessons, type: section.type,
                  groupIdx: gi, groupTitle: group.title
                });
              }
            });
          });
        });
      });
    });
    const recent = state.quizHistory.slice(-5).reverse();
    return {
      totalWords: totalWords, knownCount: knownCount,
      progress: totalWords > 0 ? knownCount / totalWords : 0,
      reviewWords: reviewWords, recentQuizzes: recent
    };
  }

  /* ---------------- Public API ---------------- */
  global.UX = {
    on: on, emit: emit,
    loadAll: loadAll,
    getUnits: function () { return state.units; },
    getStatistics: getStatistics,
    getQuizHistory: function () { return state.quizHistory.slice(); },
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
