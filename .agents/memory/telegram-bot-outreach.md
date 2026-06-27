---
name: Telegram bot proactive outreach constraint
description: Why the Sales Bot cannot cold-message contacts and the deep-link pattern used instead
---

# Telegram bots cannot message users first

Telegram's Bot API has no method to send a message to an arbitrary phone number or
username. A bot can only message a chat after that user has tapped **Start** (or
otherwise messaged the bot), which gives the bot a `chat.id`.

**How to apply:** "Proactive outreach to approved leads" is only possible for leads
that already have a `telegramChatId`. For everyone else the realistic flow is a
per-lead deep link `https://t.me/<botUsername>?start=<leadId>`. When the contact
taps it, Telegram delivers `/start <leadId>` to the webhook; link that chat to the
existing lead (only if it is in an approved/contactable state — never auto-link an
unapproved lead, that bypasses the CEO approval gate). After linking, the bot greets
them and runs the conversation.

**Why:** Avoids promising an impossible "the bot will text them automatically"
feature. Explain this honestly in the UI.

# Other durable notes for this module

- Auto-booking a meeting from the AI conversation runs after every inbound reply.
  Guard it with a per-lead in-process lock (single-process MemStorage) plus an
  "already has an active meeting?" re-check after the AI call, or near-simultaneous
  messages create duplicate meetings/notifications.
- Admin meeting alerts go to a Telegram `adminChatId` the CEO obtains by sending
  `/myid` to the bot (the webhook replies with the chat id and exits early without
  creating a lead).
