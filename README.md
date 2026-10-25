# e.english

**e.english** is a free, offline-first web app for studying English vocabulary. It turns lesson files into an organized study space with Units, Lessons, quizzes, a review list and progress statistics, and it keeps all of your progress on your own device.

> **In short:** open a lesson, mark the words you have learned, take a quiz, and come back to the words you got wrong. No account, no sign-up, no server that stores your data.

## Contents

- [What e.english is](#what-eenglish-is)
- [Who it is designed for](#who-it-is-designed-for)
- [Main features](#main-features)
- [Units and Lessons](#units-and-lessons)
- [Content types](#content-types)
- [Part of speech system](#part-of-speech-system)
- [Quiz system](#quiz-system)
- [Quiz History](#quiz-history)
- [Review system](#review-system)
- [Progress and statistics](#progress-and-statistics)
- [Offline-first behavior](#offline-first-behavior)
- [Local data and storage](#local-data-and-storage)
- [Theme and customization](#theme-and-customization)
- [Information page](#information-page)
- [Feedback](#feedback)
- [Automatic updates](#automatic-updates)
- [Privacy](#privacy)
- [Import and export](#import-and-export)
- [Advanced settings](#advanced-settings)
- [Supported devices and browsers](#supported-devices-and-browsers)
- [Project structure](#project-structure)
- [How content is organized](#how-content-is-organized)
- [Usage notes and limitations](#usage-notes-and-limitations)
- [Credits and copyright](#credits-and-copyright)

## What e.english is

e.english is a static website. It has no back end and no database. The lessons are plain Markdown files stored in the `Files/` folder, and the app reads them in your browser and builds every screen from them.

Everything you do, such as ticking a word as learned or finishing a quiz, is saved in your browser's local storage. After the first visit the whole app also works without an internet connection.

## Who it is designed for

e.english is built for learners who want a calm, focused way to practise vocabulary from a course or textbook:

- Students who study vocabulary in short lessons and want to check themselves often.
- Learners who want to see clearly which words they know and which ones still need work.
- Anyone who wants a private study tool that works on a phone, a tablet or a computer, with or without internet.

## Main features

- **Units and Lessons** that mirror a course structure.
- **Four content types** in every lesson: Vocabulary, Synonyms & Antonyms, Idioms & Phrasal Verbs, and Derivatives.
- **Word cards** that show the word, its part of speech, its difficulty, its meaning and any extra fields.
- **Learned checkboxes** for each word and for each group of words.
- **Two quiz modes** that open as a fullscreen session: you can move between questions, come back to skipped ones, and finish when you are ready. They come with an estimated time, a smart time limit, near-miss scoring and a compact result screen.
- **A Review list** that collects the words you flagged, the words you got wrong and the words you skipped.
- **Statistics** for learning progress in each content type and overall.
- **Quiz History**: a tab of its own with every past quiz and its details.
- **Search** across every word and meaning.
- **Arabic and English interface** (Arabic is shown right-to-left), switched from a floating button or from Settings.
- **Light, Dark and System themes** (also switchable from the floating button) and a choice of seven accent colors.
- **Feedback** page to contact the developer on WhatsApp.
- **Offline support** through a service worker.
- **Import and export** of your progress as a JSON file.

## Units and Lessons

Content is organized in three levels:

1. **Unit**: a large block of the course, for example *Unit 2*.
2. **Lesson**: a pair of lessons that share one file, for example *Lesson 1-2*.
3. **Section**: one of the four content types inside a lesson.

On the Home screen every **Unit** card shows one progress bar with a percentage. It counts **all** learnable words in **all** lessons of that unit (Vocabulary, Synonyms & Antonyms, Idioms & Phrasal Verbs and Derivatives together), using the same counting as the Statistics page. There is no separate bar for each lesson on Home, and the bar updates as soon as you mark a word as learned.

Inside a section, words are arranged in **Groups**. A group is a small set of words, usually six, that you can open and close. On a large screen the groups sit side by side in a grid. On a phone they stack in one column.

## Content types

| Content type | What it contains |
| --- | --- |
| **Vocabulary** | Single words with their meaning, part of speech and difficulty. |
| **Synonyms & Antonyms** | Words together with similar words and opposite words. They are shown as larger **study cards** (see below). |
| **Idioms & Phrasal Verbs** | Fixed expressions and verb-plus-particle combinations. |
| **Derivatives** | Related word forms built from a base word. |

Each type is counted on its own in the statistics, so a long vocabulary list never hides your progress in a shorter section.

### Synonyms & Antonyms study cards

Synonyms and Antonyms are for studying, so their cards are bigger than the others. Each card shows the **word** large, its **meaning** right below it, and then two clearly separate groups: **Synonyms** and **Antonyms**. Every related word is its own large, easy-to-tap chip, and the two groups differ by title, icon, tone and outline (solid or dashed), so they never depend on color alone. There is one card per row on every screen size, so nothing is squeezed. The learned checkbox and the Review button work as on any other card.

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

| Mode | Words used |
| --- | --- |
| **Full Quiz** | Every vocabulary word in the lesson. |
| **Selected Quiz** | Only the words you marked as learned. |

The Selected Quiz button unlocks as soon as at least one word is marked as learned, and it locks again if you unmark them all.

**Dynamic duration.** There are no fixed 15 or 30 minute limits any more. Before you start, each button shows an **estimated time**, for example `Estimated time: 12–16 min`, and the number of words. Three different numbers are involved:

| Number | What it is |
| --- | --- |
| **Estimated duration** | What a typical attempt should take. |
| **Estimated range** | The fast-to-careful range shown on the button. |
| **Time limit** | What the timer actually allows. It is set well above the estimate so the quiz never feels rushed. |

The estimate is built question by question from reading time (longer meanings take longer), recall time and the number of letters you must type, plus a small allowance for tapping through to the next question. A slight slowdown is added for long quizzes. The time limit is roughly 1.75 times the estimate plus a one-minute buffer, and it always stays above the slow end of the range. The Quiz Engine calculates all of this, so a quiz of 80 words gets a time limit that fits 80 words, not a number borrowed from a 20-word quiz.

**A quiz is a session**

When you start a quiz the words are picked at random **once**. Their order is then **fixed** for the whole session: moving between questions never shuffles anything.

- The quiz takes the **whole screen**. The bottom bar, the side menu and the theme button disappear, so you can focus.
- You see the meaning of a word and type the English word. **Previous** and **Next** (or `Enter` for Next, `Alt` + arrow keys on a keyboard) move between questions.
- Your answer is **kept** when you leave a question and is there when you come back. You can change it any time.
- There is no Skip button. If you leave a question **empty**, it is marked **skipped** automatically. You can return to it and answer it later.
- Nothing is marked right or wrong while you answer. The quiz stays blind until the results.

**Question numbers and states.** Every question is in one of three states:

| State | Meaning | How it looks |
| --- | --- | --- |
| **Unanswered** | Not visited yet, or visited and still empty. | An empty gray outline. |
| **Answered** | You have typed something. It does **not** mean the answer is correct. | Filled green with a check mark. |
| **Skipped** | You left it empty and moved on. | A dashed outline with a dash. |

The state is never shown by color alone: each one has its own shape and marker, and a text label for screen readers. The question you are on has a ring around it.

- **On a phone**, a strip of numbered buttons sits at the top. Tap a number to jump to that question.
- **On a large screen** (1024px and wider) a compact panel on the right lists every question of the session and works the same way. It shows each question's meaning rather than the English word, because the English words are the answers. A switch for this is `PANEL.SHOW_ENGLISH_WORDS` in `quiz-engine.js`.

**Finishing.** After the last question, **Review & finish** (also available from the top bar at any time) opens a short summary: how many questions are **Answered**, **Skipped** and **Unanswered**, and a button for each question that still has no answer so you can go back to it. Only when you press **Finish quiz** is everything checked and scored.

**The timer.** The clock counts real time. As the limit approaches, the clock and a thin time bar turn amber, then red for the last moments. Only the red state pulses, and only gently. When time runs out, the quiz is finished for you: what you wrote is checked, and the questions you did not answer are counted as skipped.

**Scoring**

| Result | Meaning | Points |
| --- | --- | --- |
| **Correct** | The answer matches the word after cleaning it up. | **1** |
| **Near Miss** | You clearly meant the right word but made a small typing mistake. | **0.5** |
| **Wrong** | Anything else. | **0** |
| **Skipped** | The question was left empty. | **0** |

Before comparing, the answer is trimmed, written in lowercase, has repeated spaces merged, and loses harmless punctuation at the end. Near misses are found with an edit-distance check (Levenshtein), not by guessing:

- Words shorter than 5 letters must be exact. One wrong letter in `cat` makes it a different word.
- Words of 5 to 8 letters allow one typing mistake. Swapping two neighbouring letters counts as one mistake.
- Words of 9 letters or more allow up to two mistakes.
- The answer must also stay at least 75% similar to the word, and shorter words must keep their first letter.

For example, `enviroment` for `environment` is a near miss and scores 0.5, while `banana` for `apple` is wrong. The limits are named constants at the top of `JavaScript/quiz-engine.js`, so they can be tuned without touching the algorithm.

**Question order.** Words that are in your review list are chosen more often, about seven out of every ten questions while they last. Every word appears exactly once.

**Result screen.** When the quiz ends you see a compact summary:

- **Score**, for example `52.5 / 70`. Half points are never rounded away.
- **Percentage**, calculated from the real maximum score.
- Four small boxes: **Correct**, **Near Miss**, **Wrong** and **Skipped**.

Everything else is hidden behind **Advanced Details**. Open it to see the exact and maximum score, percentage, accuracy (skipped questions excluded), all four counts, time spent, estimated time, time limit and a question-by-question breakdown with filters. Each row shows the word, its meaning, what you wrote and the points earned.

**Quiz Engine architecture.** All quiz logic lives in `JavaScript/quiz-engine.js`: question selection, modes, duration estimate, timer maths, answer checking, scoring and result records. It has no access to the page, to storage or to the event bus, and it loads before everything else. `JavaScript/ux.js` connects it to the app: it keeps the quiz state, runs the timer, applies the Review rules, saves history and announces changes. `JavaScript/ui.js` only draws the screens.

## Review system

A word is **in review** when either of these is true:

- you flagged it yourself with the **Review** button on its card, or
- you **answered it wrongly** or **skipped it** in a quiz.

A **Near Miss never enters Review**, and neither does a correct answer. Quiz-made entries remember why the word is there (`wrong` or `skipped`).

Both ways lead to the **same** word, in the same Unit and Lesson. There is only one review state per word, so the word card, the Review list on the Statistics page and the quiz always agree.

- Press **Review** on a card to add the word. Press **In review** to remove it. Removing it clears every review record for that word.
- Marking a word as **learned** clears a review entry that came from a quiz. A flag you set by hand stays until you remove it.
- Answering a word correctly in a later quiz also clears its quiz-made entry.
- Your own manual flags are never replaced by a quiz result.
- A word can never appear twice in the list.
- Tap a word in the Review list to jump straight to its card in the lesson.

All of this updates immediately. You never need to refresh the page.

## Progress and statistics

The **Statistics** page is only about **learning progress**. At the top it shows **Overall progress** as one large percentage with a bar. Below it, a single list shows the progress of each content type, each with its own bar:

- Vocabulary
- Synonyms & Antonyms
- Idioms & Phrasal Verbs
- Derivatives
- Overall, which combines all four

Below the bars you will find the **Words to review** list. Every number updates live when you change a checkbox, a review flag or finish a quiz.

Past quizzes are **not** shown here. They have their own tab, described next.

## Quiz History

The **Quiz History** tab lists your last 40 quizzes, newest first. Each item shows the quiz mode, the lesson, the score (for example `52.5 / 70`), the percentage, the time spent, the number of correct, near-miss, wrong and skipped answers, and the date and time.

Tap an item to open the same result view you saw after the quiz, including **Advanced Details**.

Every history item is a **snapshot**. For each question it stores the word, its meaning, the expected answer, what you typed, the result and the points. Because of that, an old result stays exactly as it was even if the lesson files change later. Older history saved by earlier versions is upgraded automatically when the app starts.

## Offline-first behavior

The first time you open the site online, a service worker saves the app files and the lessons in your browser cache. From then on:

- the app opens and works with no connection,
- lessons load from the cache and are refreshed quietly in the background when you are online,
- the Quiz Engine and the rest of the app code are cached too, so quizzes work with no connection,
- this README is cached too.

Each release of the app has a **model version** (see `JavaScript/version.js`). When the version changes, the old cached app files are replaced with new ones. Only the cache is replaced. Your learning data is never touched by a version change.

## Local data and storage

Your progress is stored in your browser's `localStorage` under these keys:

| Key | What it stores |
| --- | --- |
| `eenglish.known` | The words you marked as learned. |
| `eenglish.manualReview` | Words you flagged for review. |
| `eenglish.autoReview` | Words added to review by a quiz: wrong or skipped, with the reason. |
| `eenglish.quizHistory` | Your last 40 quiz results, each with a snapshot of every question. |
| `eenglish.theme` | Light, Dark or System. |
| `eenglish.themeColor` | Your accent palette, if you chose one. |
| `eenglish.lang` | Your interface language (English or Arabic). |
| `eenglish.keepAwake` | The keep-screen-awake setting. |
| `eenglish.app` | A small marker with the app version. It is not learning data. |

Every word has a stable ID built from its Unit, Lesson, section and text, never from its position in a file. You can reorder a lesson file and your progress stays with the right words.

**Keeping storage honest.** Each time the lessons load completely, the app compares your saved word state (learned and review) with the current lessons. Entries that belong to words that no longer exist are removed, and a word can never be in both review lists. Progress for words that still exist is never changed. Quiz history is not trimmed this way, because each record carries its own snapshot. If any lesson file fails to load, nothing is removed.

## Theme and customization

Open **Settings** to change the look of the app.

**Theme mode**

- **Light**
- **Dark**
- **System**: follows your device and changes live when your device switches between light and dark.

The **floating theme button** in the corner uses the same setting. Each tap moves to the next mode: Light, then Dark, then System, then Light again. Its icon always shows the mode you are in (sun, moon or monitor), and the Settings selector follows it instantly. The button is hidden while a quiz is running.

**Accent color**

- **Default** is a neutral graphite with cool grey surfaces, chosen to be easy on the eyes for long reading on a phone. One calm primary color is used for actions, the active tab and progress. Other colors appear only where they help tell things apart: the four content types (Vocabulary, Synonyms & Antonyms, Idioms & Phrasal Verbs, Derivatives) and the part-of-speech tags. Green, amber and red are kept for success, review and errors.
- Choosing one of the six palettes makes that color the single accent across the whole app. Success, review, error, the Review flag and part-of-speech colors keep their meaning.

| Choice | Hue |
| --- | --- |
| Default | Neutral graphite |
| Burgundy | Deep red |
| Lavender | Purple |
| Sky Blue | Blue |
| Lime | Green |
| Orange | Orange |
| Teal | Blue-green |

Every palette works in both Light and Dark mode. The browser's toolbar color follows your choice on devices that support it. If an earlier version saved a palette that is no longer offered (Midnight, Plum, Petrol, Umber, Rose or Sand), it keeps working and is replaced only when you choose one of the seven.

**Language**

Choose **العربية** or **English** in Settings, or tap the small language button next to the theme button. The whole interface changes, including the direction of the layout (right-to-left for Arabic). Words, meanings, answers and the study text are lesson content and are not translated. Your choice is saved, and switching language never changes your progress, a running quiz or your other settings. The language button is hidden while a quiz is running.

**Font style**

The app has two font files, `Ui/Regular.ttf` and `Ui/Bold.ttf`, and three modes in Settings:

| Mode | What you get |
| --- | --- |
| **O2** (recommended, the default) | Bold headings and Regular text. |
| **Regular** | All text Regular, headings included. |
| **Bold** | All text Bold, normal text included. |

The choice is saved and applies to every screen at once. English letters in Regular text come from your device font, because `Regular.ttf` contains Arabic and digits but no Latin letters.

**Progress colors.** Every progress bar in the app (Home, Statistics, lessons and quizzes) uses the same look and the same color system as the rest of the theme. By default each content type keeps its quiet secondary color. When you choose an accent palette, all bars switch to that accent.

**Highlights.** Important notes and key phrases use one subtle highlight style across the site: a soft, rounded, low-intensity background behind normal text, like a real highlighter. It never has a glow or a blur, and it is used only for a key phrase, a note or a tip, never for whole paragraphs. Highlighter colors (yellow, green, purple, pink) are separate from the theme colors and do not change with the accent.

**Keep screen awake** stops the screen from turning off while you study, where the browser supports it.

## Information page

The **Info** tab has these parts, in this order:

- **About e.english**: the app **version**, what is new in this version, and a short description of the site.
- **Study method** (first): a suggested way to study with the app, written by the owner of the site in his own words (Egyptian Arabic). It talks about paper and three pens, starting with a few words, splitting long words into parts, resting for a short time, testing yourself on an empty sheet, marking mistakes with a highlighter and the **Review** button, taking a quiz, and reviewing by hiding the Arabic and then the English. A few key phrases are highlighted so the eye catches them. A split word such as indivi + duals shows each part in its own chip. Pen colors named in the text (red, black, blue) are shown as colored ink, not as highlighter chips.
- A small **legend** of highlighter colors (Yellow, Green, Purple, Pink), shown as small rounded rectangles like real highlighters, and a note: do not use the same or similar colors for different ideas, because the brain can mix them up. For example, if you use the red pen for hard words, do not use a red highlighter for them.
- **Parts of speech**: what each tag means, with its color.
- A small footer with the credit and the copyright.

## Feedback

The **Feedback** tab lets you contact the developer to report a bug, suggest an improvement, share an opinion or send any other feedback. It explains how to describe a problem (the affected feature, the steps to repeat it, what you expected and what happened, and your device and browser). The **Contact me on WhatsApp** button opens a WhatsApp chat with the developer (username `@Ma7mee7o`). The website itself does not send, collect or store any message.

## Automatic updates

`JavaScript/version.js` holds two separate numbers that are never mixed up:

| Number | Meaning |
| --- | --- |
| `EE_MODEL_VERSION` | The **app version** (a release of e.english). |
| `EE_JS_VERSION` | The **JavaScript loading version**. Scripts are requested as `ux.js?js=2`, and the cache is named after both numbers, for example `e-english-v11-js2`. Changing it forces every script and cache to start fresh without a new app release. |

When you open the app, it asks the server which versions are current. If either one is different from the one running, newer **or older**, the app refreshes itself once the new files have had a few seconds to arrive.

To make sure a problem with the cache or the network can never cause an endless refresh loop, the app counts its automatic refreshes in local storage under the fixed key `refreshTimes`:

- At most **3** automatic refreshes are made for one update. When `refreshTimes` reaches 3 the auto-refresh stops completely, and the value is kept.
- A **new update** sets `refreshTimes` back to 0 and starts a new cycle.
- A **manual refresh** by you (pull-to-refresh, F5, the browser's reload button) also sets it back to 0.
- The app's own automatic reloads never reset it, so a stuck update cannot start over by itself.
- **Offline**, nothing is refreshed and no attempt is used. The check runs again when the connection returns.
- A refresh never happens while you are in a quiz.

Updating only replaces the app files and its cache. Your progress, review lists, quiz history and settings are never touched.

## Privacy

e.english is local-first.

- There are no accounts and no tracking.
- Your progress is never uploaded. It stays in your browser.
- The app makes requests only to its own files. It does not load fonts, icons or scripts from other websites. The only link that leaves the app is the **Contact me on WhatsApp** button, and only when you tap it.
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

e.english runs in current versions of Chrome, Edge, Safari and Firefox, on phones, tablets and computers. The layout adapts to the screen:

- **Phones**: one column and a navigation bar at the bottom (Home, Statistics, History, Settings, Info, README).
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
README.md               This file, also shown in the app (English)
README.ar.md            The Arabic version of this file
CSS/
  root.css              Design tokens, themes, 6 accent palettes + neutral Default
  responsive.css        Layout and components
  settings.css          Settings screen
  animations.css        Motion
JavaScript/
  version.js            App version + JavaScript loading version
  icons.js              Built-in icon set
  i18n.js               English / Arabic translation (one dictionary)
  quiz-engine.js        Quiz logic: duration, scoring, answer checking
  ux.js                 State, storage, event bus, quiz and review glue
  ui.js                 Screens and rendering
  settings.js           Settings screen
  readme.js             README screen and Markdown renderer
  pages.js              Feedback screen + version / changelog on Info
Files/
  U02-L1-2.md ...       Lesson files
Ui/
  Logo.png              Logo
  Regular.ttf, Bold.ttf The two font files
```

The code is split on purpose. `quiz-engine.js` holds pure quiz logic and touches nothing else. `ux.js` owns the app state and storage and has no access to the page. `ui.js`, `settings.js` and `readme.js` only draw screens and talk to `ux.js`. When something changes, `ux.js` announces it on a small event bus, and every open screen updates itself.

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


## Usage notes and limitations

- Progress belongs to one browser on one device. There is no sync, so use Export and Import to move it.
- Private browsing windows and cleared site data do not keep progress.
- A quiz is not saved mid-way. If you leave a quiz, its answers are discarded and nothing is added to Review or History.
- Quizzes cover one lesson pair at a time, and only its Vocabulary section. The estimated time is a guide: how fast you really type will vary.
- Renaming a word, or moving it to another Unit, Lesson or section, makes it a new word. Its old progress is then removed.
- The first visit needs an internet connection so the lessons can be cached for offline use.

## Credits and copyright

Created by Mouhammed & Anas.

© 2026 e.english. All rights reserved.
