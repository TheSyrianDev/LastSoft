# Product

LastSoft is the umbrella name for four local-first AI tools written in Rust by
one developer (TheSyrianDev / Omar). This repository is the umbrella site that
presents all four and routes a technical visitor to the one they want.

Facts marked (inferred) were taken from the project repositories rather than
confirmed in conversation; the owner should correct them.

## Platform

web

## Stack

Static HTML, CSS and JavaScript, no build step, served by GitHub Pages. No
framework: the site must stay readable as source and load without a bundler.
Libraries are allowed where they earn their weight (Three.js for the hero,
Motion One for animation), loaded as ES modules.

## Users

(inferred) Developers and technically literate people who run models locally:
people with a GPU or an Apple laptop, comfortable with a terminal, who already
know what llama.cpp, Ollama, LM Studio or Hugging Face are. They arrive from
GitHub, a link in a release, or a search for a local AI assistant. They judge
software by what it does on their machine, and they distrust marketing copy.

## Product Purpose

Make the family legible in one screen and get the right person to the right
artifact: the app, the harness, the engine, the downloader. The site is not the
product; Last AI is. Success is a visitor understanding what the suite is and
then installing one thing.

## Positioning

Everything runs on the visitor's own machine, with no account and no cloud.
Four parts that stand alone: an assistant, the harness under it, an inference
engine, and a model downloader. Open source in the open, pre-release, honest
about being early.

## Operating Context

Read in a browser, usually on a desktop, often arriving from GitHub. Many
visitors are on Linux. The page competes with documentation tabs and a terminal;
it has to justify itself in seconds and must not be slow.

## Capabilities and Constraints

- Last AI: alpha 0.1.0-alpha.2, Linux (deb, rpm, Arch, Omarchy, AppImage),
  Windows zip, macOS `.app` in a zip (early alpha). Desktop app, terminal client
  (`la`/`lastai`), a local core (`lastaid`).
- LH: the harness inside Last AI today; not a separate downloadable artifact.
- LastEngine: in development; no release to link.
- hf-dl: v0.4.0-rc.1.
- Licence: PolyForm Noncommercial 1.0.0.
- No pricing, no customers, no benchmarks, no testimonials. None may be invented.
- Brand assets that exist: the hand-drawn lockup (green `#b2c27c` accent, cream
  `#f2ead6` ink on dark, `#15251c` ink on light, orange `#e0a050` dot), the app
  icon, the six built-in themes.

## Brand Commitments

The lockup is the identity and is not redrawn. The green/cream palette is the
brand. Voice: plain, specific, unexcited; it describes what a program does and
what it does not do yet.

## Evidence on Hand

The lockup SVGs, the app icon, the install commands from the release, the
README's own description, the four repositories. No screenshots of the running
app exist in the repositories, and no device imagery may be faked as real.

## Product Principles

1. It runs on your machine, at your expense, under your control.
2. Each part is useful alone; the bundle is a convenience, not a lock.
3. Say the version and say what is missing.

## Accessibility & Inclusion

Body text meets 4.5:1 contrast, keyboard focus is visible, motion respects
`prefers-reduced-motion`, and the WebGL hero degrades to a static composition
where WebGL is unavailable.
