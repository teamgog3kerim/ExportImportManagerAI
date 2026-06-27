// Thin wrapper around the Telegram Bot API (HTTP). No external SDK needed —
// every call is a POST to https://api.telegram.org/bot<token>/<method>.
// The bot token comes from BotFather and is stored as the TELEGRAM_BOT_TOKEN
// secret. A separate TELEGRAM_WEBHOOK_SECRET (optional) is echoed back by
// Telegram in the X-Telegram-Bot-Api-Secret-Token header so we can verify
// that webhook calls genuinely originate from Telegram.

const API_BASE = "https://api.telegram.org";

export function getBotToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN;
}

export function isTelegramConfigured(): boolean {
  return !!getBotToken();
}

export function getWebhookSecret(): string | undefined {
  return process.env.TELEGRAM_WEBHOOK_SECRET;
}

async function callTelegram<T = any>(method: string, params: Record<string, unknown>): Promise<T> {
  const token = getBotToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description ?? res.statusText}`);
  }
  return data.result as T;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

export async function getBotInfo(): Promise<TelegramBotInfo> {
  return callTelegram<TelegramBotInfo>("getMe", {});
}

export async function sendTelegramMessage(chatId: string | number, text: string): Promise<void> {
  await callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  });
}

export async function setTelegramWebhook(url: string): Promise<void> {
  const params: Record<string, unknown> = {
    url,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  };
  const secret = getWebhookSecret();
  if (secret) params.secret_token = secret;
  await callTelegram("setWebhook", params);
}

export async function deleteTelegramWebhook(): Promise<void> {
  await callTelegram("deleteWebhook", { drop_pending_updates: false });
}

// Minimal shape of an incoming Telegram update we care about.
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; is_bot: boolean; first_name?: string; last_name?: string; username?: string };
    chat: { id: number; type: string; title?: string; first_name?: string; username?: string };
    text?: string;
  };
}
