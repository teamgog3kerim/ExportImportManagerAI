---
name: Replit OpenAI integration proxy — unsupported endpoints
description: Which OpenAI endpoints the javascript_openai_ai_integrations proxy blocks, and the fallback used
---

The Replit-managed OpenAI integration (env `AI_INTEGRATIONS_OPENAI_API_KEY` +
`AI_INTEGRATIONS_OPENAI_BASE_URL`) does NOT proxy every OpenAI endpoint.

Confirmed blocked: `POST /audio/speech` (text-to-speech) — returns
`400 Endpoint: 'POST /audio/speech' is not supported.` for both
`gpt-4o-mini-tts` and `tts-1`.

Working: `chat.completions.create` (incl. gpt-5-mini with
`max_completion_tokens`, not `max_tokens`).

**Why:** the proxy whitelists a subset of endpoints; audio synthesis isn't included.
**How to apply:** for runtime TTS of dynamic text, fall back to the browser
Web Speech API (`window.speechSynthesis`) instead of an OpenAI TTS route — no
backend, no cost. Before building any new OpenAI-endpoint feature against this
integration, quick-test the endpoint with a throwaway script (run from project
root so `openai` resolves) rather than assuming it works.
