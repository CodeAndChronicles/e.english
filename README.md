# E English

**E English** is a free, offline-first web app for studying English vocabulary. It turns lesson files into an organized study space with Units, Lessons, quizzes, a review list and progress statistics, and it keeps all of your progress on your own device.

> **In short:** open a lesson, mark the words you have learned, take a quiz, and come back to the words you got wrong. No account, no sign-up, no server that stores your data.

## Contents

- [What E English is](#what-e-english-is)
- [Who it is designed for](#who-it-is-designed-for)
- [Main features](#main-features)
- [Units and Lessons](#units-and-lessons)
- [Content types](#content-types)
- [Part of speech system](#part-of-speech-system)
- [Quiz system](#quiz-system)
- [Review system](#review-system)
- [Progress and statistics](#progress-and-statistics)
- [Offline-first behavior](#offline-first-behavior)
- [Local data and storage](#local-data-and-storage)
- [Theme and customization](#theme-and-customization)
- [Privacy](#privacy)
- [Import and export](#import-and-export)
- [Advanced settings](#advanced-settings)
- [Supported devices and browsers](#supported-devices-and-browsers)
- [Project structure](#project-structure)
- [How content is organized](#how-content-is-organized)
- [Usage notes and limitations](#usage-notes-and-limitations)
- [Credits and copyright](#credits-and-copyright)

## What E English is

E English is a static website. It has no back end and no database. The lessons are plain Markdown files stored in the `Files/` folder, and the app reads them in your browser and builds every screen from them.

Everything you do, such as ticking a word as learned or finishing a quiz, is saved in your browser's local storage. After the first visit the whole app also works without an internet connection.

## Who it is designed for

E English is built for learners who want a calm, focused way to practise vocabulary from a course or textbook:

- Students who study vocabulary in short lessons and want to check themselves often.
- Learners who want to see clearly which words they know and which ones still need work.
- Anyone who wants a private study tool that works on a phone, a tablet or a computer, with or without internet.

## Main features

- **Units and Lessons** that mirror a course structure.
- **Four content types** in every lesson: Vocabulary, Synonyms & Antonyms, Idioms & Phrasal Verbs, and Derivatives.
- **Word cards** that show the word, its part of speech, its difficulty, its meaning and any extra fields.
- **Learned checkboxes** for each word and for each group of words.
- **Two quiz modes** with a timer and a full results breakdown.
- **A Review list** that collects the words you flagged and the words you got wrong.
- **Statistics** for each content type and for all content together.
- **Search** across every word and meaning.
- **Light, Dark and System themes** and a choice of eight accent palettes.
- **Offline support** through a service worker.
- **Import and export** of your progress as a JSON file.

## Units and Lessons

Content is organized in three levels:

1. **Unit**: a large block of the course, for example *Unit 2*.
2. **Lesson**: a pair of lessons that share one file, for example *Lesson 1-2*.
3. **Section**: one of the four content types inside a lesson.

Inside a section, words are arranged in **Groups**. A group is a small set of words, usually six, that you can open and close. On a large screen the groups sit side by side in a grid. On a phone they stack in one column.

## Content types

| Content type | What it contains |
| --- | --- |
| **Vocabulary** | Single words with their meaning, part of speech and difficulty. |
| **Synonyms & Antonyms** | Words together with a similar word and an opposite word. |
| **Idioms & Phrasal Verbs** | Fixed expressions and verb-plus-particle combinations. |
| **Derivatives** | Related word forms built from a base word. |

Each type is counted on its own in the statistics, so a long vocabulary list never hides your progress in a shorter section.

## Part of speech system

Many words carry a small colored tag, such as `n.` or `adj.`. The tag tells you what job the word does in a sentence. Every part of speech has its own color, in both Light and Dark mode, so you can recognize it at a glance.

| Tag | Meaning |
| --- | --- |
| `n.` | **Noun**: names a person, place, thing or idea. |
| `v.` | **Verb**: describes an action, a state or something that happens. |
| `adj.` | **Adjective**: describes or gives more information about a noun. |
| `adv.` | **Adverb**: describes a verb, an adjective or another adverb. |
| `pron.` | **Pronoun**: takes the place of a noun. |
| `prep.` | **Preposition**: shows how a noun relates to another word. |
| `conj.` | **Conjunction**: joins words, phrases or sentences. |
| `phr.v.` | **Phrasal verb**: a verb plus a particle that work as one verb. |
| `n.phr.` | **Noun phrase**: a group of words that works as a noun. |
| `adj.phr.` | **Adjective phrase**: a group of words that works as an adjective. |
| `phr.` | **Phrase**: a fixed group of words learned as one unit. |

If a word can work in two ways, it has two tags separated by a slash, such as `n./v.`. Each part is shown as its own badge with its own color. A tag the app does not recognize is shown in a neutral color. The full explanations are also on the **Info** page.

## Quiz system

Quizzes are opened from the **Vocabulary** section of a lesson. They always cover that one lesson only.

| Mode | Words used | Time limit |
| --- | --- | --- |
| **Full Quiz** | Every vocabulary word in the lesson. | 30 minutes |
| **Selected Quiz** | Only the words you marked as learned. | 15 minutes |

The Selected Quiz button unlocks as soon as at least one word is marked as learned, and it locks again if you unmark them all.

**How a question works**

1. You see the meaning of a word.
2. You type the English word and press **Submit**, or press **Skip**.
3. The correct word is not shown during the quiz. The full breakdown appears at the end.

**How answers are checked**

- Capital letters, extra spaces and end punctuation are ignored.
- An exact match is **correct**.
- A near miss, such as a small typing mistake, is marked **wrong**.
- An empty answer or a skipped question is **skipped**.
- When the time runs out, the questions you did not answer are counted as skipped.

**Question order.** Words that are in your review list are chosen more often, about seven out of every ten questions while they last. Every word appears exactly once.

**Results.** After each quiz you see the totals, the list of wrong words and the list of skipped words. The last 40 quizzes are kept, and you can reopen any of them from the Statistics page.

## Review system

A word is **in review** when either of these is true:

- you flagged it yourself with the **Review** button on its card, or
- you answered it wrongly in a quiz.

Both cases lead to the **same** word, in the same Unit and Lesson. There is only one review state per word, so the word card, the Review list on the Statistics page and the quiz always agree.

- Press **Review** on a card to add the word. Press **In review** to remove it. Removing it clears every review record for that word.
- Marking a word as **learned** clears a review flag that came from a quiz. A flag you set by hand stays until you remove it.
- Answering a word correctly in a later quiz also clears its quiz-made flag.
- A word can never appear twice in the list.
- Tap a word in the Review list to jump straight to its card in the lesson.

All of this updates immediately. You never need to refresh the page.

## Progress and statistics

The **Statistics** page shows, each with a progress bar:

- Vocabulary
- Synonyms & Antonyms
- Idioms & Phrasal Verbs
- Derivatives
- Overall, which combines all four

Below the bars you will find the **Words to review** list and your **Recent quizzes**. Every number updates live when you change a checkbox, a review flag or finish a quiz.

## Offline-first behavior

The first time you open the site online, a service worker saves the app files and the lessons in your browser cache. From then on:

- the app opens and works with no connection,
- lessons load from the cache and are refreshed quietly in the background when you are online,
- this README is cached too.

Each release of the app has a **model version** (see `JavaScript/version.js`). When the version changes, the old cached app files are replaced with new ones. Only the cache is replaced. Your learning data is never touched by a version change.

## Local data and storage

Your progress is stored in your browser's `localStorage` under these keys:

| Key | What it stores |
| --- | --- |
| `eenglish.known` | The words you marked as learned. |
| `eenglish.manualReview` | Words you flagged for review. |
| `eenglish.autoReview` | Words added to review by a wrong quiz answer. |
| `eenglish.quizHistory` | Your last 40 quiz results. |
| `eenglish.theme` | Light, Dark or System. |
| `eenglish.themeColor` | Your accent palette, if you chose one. |
| `eenglish.keepAwake` | The keep-screen-awake setting. |
| `eenglish.app` | A small marker with the app version. It is not learning data. |

Every word has a stable ID built from its Unit, Lesson, section and text, never from its position in a file. You can reorder a lesson file and your progress stays with the right words.

**Keeping storage honest.** Each time the lessons load completely, the app compares your saved data with the current lessons. Progress that belongs to words that no longer exist is removed, and quiz records are trimmed so their totals match the words that can really be shown. Progress for words that still exist is never changed. If any lesson file fails to load, nothing is removed.

## Theme and customization

Open **Settings** to change the look of the app.

**Theme mode**

- **Light**
- **Dark**
- **System**: follows your device and changes live when your device switches between light and dark.

**Accent color**

- **Default** keeps the app multi-colored: section icons, part-of-speech badges and state colors each keep their own color.
- Choosing one of the eight palettes makes that color the single accent across the whole app. Success, warning, danger and part-of-speech colors keep their meaning.

| Deep palettes | Soft palettes |
| --- | --- |
| Midnight | Sky |
| Plum | Lavender |
| Petrol | Rose |
| Umber | Sand |

Every palette works in both Light and Dark mode. The browser's toolbar color follows your choice on devices that support it.

**Keep screen awake** stops the screen from turning off while you study, where the browser supports it.

## Privacy

E English is local-first.

- There are no accounts and no tracking.
- Your progress is never uploaded. It stays in your browser.
- The app makes requests only to its own files. It does not load fonts, icons or scripts from other websites.
- Deleting the browser's site data, or using **Delete All Data**, removes your progress for good unless you exported a backup.

## Import and export

Both actions are in **Settings**, inside **Advanced**.

- **Export Data** downloads a file named `eenglish-backup-YYYY-MM-DD.json` with your learned words, review lists, quiz history and preferences.
- **Import Data** reads such a file and replaces your current progress with it, after asking you to confirm.

Use them to back up your progress or move it to another device. After an import, the app checks the data against the current lessons and screens refresh at once.

## Advanced settings

**Advanced** is closed by default. Open it to find:

- **Export Data**
- **Import Data**
- **Delete All Data**, which asks for confirmation before it erases anything
- **Device & Browser**: read-only information such as CPU cores, approximate memory, connection, platform, language, screen size and storage used. A value shows `N/A` when the browser does not provide it.

## Supported devices and browsers

E English runs in current versions of Chrome, Edge, Safari and Firefox, on phones, tablets and computers. The layout adapts to the screen:

- **Phones**: one column and a navigation bar at the bottom.
- **Tablets**: wider cards, with the word cards of an open group arranged in columns.
- **Desktops**: a slim side navigation, and the groups of a section shown side by side.

Notes:

- The site must be served over `http://` or `https://`. Opening `index.html` directly from disk is blocked by browsers, and the app will show instructions for running a local server.
- Offline mode needs service-worker support and a secure context (`https://` or `localhost`).
- Keep screen awake needs the Screen Wake Lock feature.

## Project structure

```text
index.html              App shell, metadata and navigation
app.json                List of lesson files to load
sw.js                   Service worker (offline cache)
manifest.webmanifest    Install metadata
README.md               This file, also shown in the app
CSS/
  root.css              Design tokens, themes, 8 accent palettes
  responsive.css        Layout and components
  settings.css          Settings screen
  animations.css        Motion
JavaScript/
  version.js            The single source of the model version
  icons.js              Built-in icon set
  ux.js                 State, storage, quiz logic, event bus
  ui.js                 Screens and rendering
  settings.js           Settings screen
  readme.js             README screen and Markdown renderer
Files/
  U02-L1-2.md ...       Lesson files
  CONTENT-FORMAT.md     How to write a lesson file
Ui/
  Logo.png, Font.ttf    Brand assets
```

The code is split on purpose. `ux.js` owns all data and logic and has no access to the page. `ui.js`, `settings.js` and `readme.js` only draw screens and talk to `ux.js`. When something changes, `ux.js` announces it on a small event bus, and every open screen updates itself.

## How content is organized

Each lesson file is named `U{unit}-L{lesson}-{lesson}.md`, for example `U02-L1-2.md`, and holds all four sections for that Unit and Lesson pair. New files must be listed in `app.json` to be loaded.

```text
## Vocabulary

### Group 1

🟢 mix [v.] | meaning
🔴 industrial [adj.] | meaning

## Synonyms & Antonyms
@fields: Synonym, Antonym

### Group 1

🟢 word [n.] | meaning | synonym | antonym
```

- `##` starts a section. Any other heading level starts a group.
- `🟢` marks an easy word and `🔴` a hard one.
- `[n.]`, `[v.]` and similar tags after the word set its part of speech.
- `@fields:` adds named extra columns to that section.
- The meaning shown on a card is taken from the lesson file, so it can be written in the learner's own language.

The complete rules are in `Files/CONTENT-FORMAT.md`.

## Usage notes and limitations

- Progress belongs to one browser on one device. There is no sync, so use Export and Import to move it.
- Private browsing windows and cleared site data do not keep progress.
- A quiz is not saved mid-way. If you leave a quiz, its answers are discarded.
- Quizzes cover one lesson pair at a time, and only its Vocabulary section.
- Renaming a word, or moving it to another Unit, Lesson or section, makes it a new word. Its old progress is then removed.
- The first visit needs an internet connection so the lessons can be cached for offline use.

## Credits and copyright

Created by Mouhammed & Anas.

© 2026 E.English. All rights reserved.
