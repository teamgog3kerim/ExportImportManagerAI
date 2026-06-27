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

# Telegram Business mode (answer on the CEO's behalf)

"This bot doesn't support Telegram Business yet" is caused by a **BotFather**
toggle, not by our code: BotFather → /mybots → bot → Bot Settings → Business Mode
→ Turn on. There is no Bot API method to enable it — it must be done in BotFather,
so always surface this instruction in the UI.

Once enabled, business chats are NOT delivered as `message`. They arrive as
`business_message` (a Message that also carries `business_connection_id`), and a
separate `business_connection` update fires when the CEO connects/disconnects.

**How to apply:**
- setWebhook `allowed_updates` must include `business_connection`,
  `business_message`, `edited_business_message` or business chats never arrive.
  Re-run setWebhook after changing allowed_updates — it only takes effect then.
- To reply in a business chat you MUST pass `business_connection_id` to
  sendMessage; a normal send is rejected. Persist that id on the lead so later
  outbound (openers, manual messages) also work, not just the inbound auto-reply.
- In a private business chat the customer's user id equals the chat id. Use
  `from.id === chat.id` (and `!from.is_bot`) to avoid auto-replying to the CEO's
  own manual messages in the same thread.

# Other durable notes for this module

- Auto-booking a meeting from the AI conversation runs after every inbound reply.
  Guard it with a per-lead in-process lock (single-process MemStorage) plus an
  "already has an active meeting?" re-check after the AI call, or near-simultaneous
  messages create duplicate meetings/notifications.
- Admin meeting alerts go to a Telegram `adminChatId` the CEO obtains by sending
  `/myid` to the bot (the webhook replies with the chat id and exits early without
  creating a lead).
- Meeting booking is constrained to admin-defined availability slots (morning/evening
  per day, pre-arranged per month). The bot offers ONLY open slots and auto-books one;
  if zero slots are open it must NOT book any free-form time (the prompt tells it to
  follow up later). **Why:** the CEO controls when meetings happen.
  **How to apply:** booking must atomically reserve the slot (compare-and-set
  available→booked with no await between read and write) before creating the meeting —
  the per-lead lock alone does not stop two *different* leads from grabbing the same
  slot. Slot datetimes are built with the fixed East Africa Time offset (+03:00).
