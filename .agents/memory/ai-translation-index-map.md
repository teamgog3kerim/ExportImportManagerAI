---
name: AI translation of ordered text segments
description: Robust pattern for translating an ordered list of strings via an LLM without losing alignment.
---

When translating a structured document (titles, headings, paragraphs, chart
labels) via an LLM while preserving order/positions, do NOT send a plain array
and require "same count, same order" — the model drops/merges segments on large
inputs and the strict count check then hard-fails the whole request.

**Rule:** send an **index→string map** (`{"0": "...", "1": "..."}`), ask the
model to return every key, then rebuild by index with **per-item fallback to the
original** for any missing/empty key. Only fail if *zero* items came back.

**Why:** the failure mode observed was full-year/detailed reports returning a
mismatched segment count (partly output truncation, partly the model collapsing
items). Index keys make alignment explicit and the per-item fallback degrades
gracefully (a few English segments) instead of erroring out.

**How to apply:** also raise `max_tokens` generously (Amharic/multibyte output is
token-heavy — 16000 for gpt-4o-mini) so long reports aren't truncated mid-JSON.
