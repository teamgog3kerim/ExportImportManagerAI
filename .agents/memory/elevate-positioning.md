---
name: hover-elevate / active-elevate conflicts with absolute positioning
description: Why an absolutely-positioned control with hover-elevate lands in normal flow, and the wrapper fix
---

The `hover-elevate`, `active-elevate`, `hover-elevate-2`, `active-elevate-2`
utilities (defined in `client/src/index.css`) set `position: relative` on the
element (they paint a `::after` overlay). If you also put `absolute` on that same
element, the utility's `position: relative` wins and the control drops into normal
flow (e.g. an in-field icon button ends up bottom-left instead of pinned right).

**Rule:** never combine `absolute`/`fixed` positioning AND an elevate utility on
the same element. Put the positioning on a wrapper `<div className="absolute ...">`
and keep the elevate utility on the inner interactive element.

**Why:** the elevate utilities require `position: relative` for their overlay, so
they force it and override your absolute. Splitting into wrapper (positioned) +
child (elevated) satisfies both.

**How to apply:** any time you pin a button/icon control inside an input or over
another element AND want the elevate hover/active effect — use the wrapper pattern.
