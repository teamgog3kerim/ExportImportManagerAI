---
name: jsPDF Amharic / Ge'ez font rendering
description: How to make jsPDF render Amharic (Ge'ez script) text and avoid blank/missing glyphs.
---

jsPDF's built-in fonts (helvetica, times, courier) cannot render Ge'ez/Ethiopic
script — output is blank or boxes. To render Amharic in a generated PDF you must
embed a font that covers the Ethiopic Unicode block.

**Rule:** embed a **static** TTF (Abyssinica SIL works, ~268KB) as a base64
string, add it to jsPDF's virtual filesystem, and register it as a font family
(both normal + bold), then `setFont(thatFamily)` on every text-drawing path
(header, body, charts, footer). Missing it on any one path reintroduces blanks.

**Why static, not variable:** jsPDF cannot parse variable fonts (e.g. the
variable Noto Sans Ethiopic) — it needs a plain static TTF.

**How to apply:** keep the base64 in its own module and lazy-import it only when
the user picks Amharic, so English PDFs don't pay the ~358KB cost. Switch the
font family via a variable (e.g. `fSans`/`fSerif`) instead of hardcoding
"helvetica"/"times" so the same draw code serves both languages.
