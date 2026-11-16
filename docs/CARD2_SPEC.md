# CHATUI1 function spec: chat font sizes and fonts

Status: **King asked 2026-11-16 ("Can we globally control the font size of the chat output… each field's font size as a value… control the actual fonts of the chat globally… in a setting?"). King answered Q-F1–Q-F3. Released in 0.64.0-alpha.1.**

## What it does

- **One window:** Configure Settings → **N5e Chat Card Appearance**.
- **Sizes:** one value in pixels per field, plus an "Everything" scale (50–200%):
  - body text, speaker, card title, type line;
  - action buttons, small buttons, tags;
  - result headings, result totals, formulas and save lines;
  - section headings, targets, Apply panel, notes and rules text.
- **Fonts:** a heading font (titles, buttons, tags, result and section headings, the speaker) and a body font (everything else). It lists the fonts Foundry has loaded, including Core settings → Additional Fonts.
- **Live preview card** in the window, and **Defaults**.

## King's answers

- **Q-F1 Who controls it: both.** The GM's world setting is everyone's default. Each user can turn on "Use my own settings" for their own client.
- **Q-F2 Fonts: headings plus body.**
- **Q-F3 Which messages: all N5e chat messages.**

## Progress log

- 2026-11-16 King: Q-F1 both, Q-F2 headings plus body, Q-F3 all N5e messages. Claude: built (0.64.0-alpha.1).
- 2026-11-16 Released 0.64.0-alpha.1.
