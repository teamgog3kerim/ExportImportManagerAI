// AI sales agent for the Telegram lead CRM. Handles three jobs:
//  1. generateSalesReply  — drafts the next message in a live conversation.
//  2. qualifyLead         — scores/qualifies a lead and suggests a pitch angle.
//  3. discoverLeads       — AI-suggests candidate companies to research (clearly
//                           labelled as unverified prospects, NOT real contacts).
// Plus parseCsvLeads, a dependency-free CSV importer for user-provided lists.

import OpenAI from "openai";
import type { SalesBotConfig, SalesLead, SalesMessage, InsertSalesLead } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SEGMENT_LABELS: Record<string, string> = {
  import_export: "import/export company",
  manufacturing: "manufacturing company",
  kindergarten_academy: "kindergarten academy / school",
  other: "company",
};

function leadProfile(lead: SalesLead): string {
  const parts = [
    `Company: ${lead.companyName}`,
    `Segment: ${SEGMENT_LABELS[lead.segment] ?? lead.segment}`,
    lead.contactName ? `Contact: ${lead.contactName}${lead.contactTitle ? `, ${lead.contactTitle}` : ""}` : "",
    lead.location ? `Location: ${lead.location}` : "",
    lead.website ? `Website: ${lead.website}` : "",
    lead.notes ? `Notes: ${lead.notes}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}

function botSystemPrompt(config: SalesBotConfig, lead: SalesLead): string {
  return [
    config.persona,
    "",
    `You represent ${config.companyName}.`,
    "Products & services you sell:",
    config.productCatalog,
    "",
    "The person you are chatting with on Telegram is this lead:",
    leadProfile(lead),
    "",
    "Guidelines:",
    "- Keep each reply short (2-5 sentences), friendly and professional. Plain text suitable for a chat app.",
    "- Discover their needs, connect them to a concrete benefit of the product, and handle objections calmly.",
    "- Your primary goal is to book a short in-person meeting or a live demo. When the person shows interest, propose 2 specific time options and ask which suits them.",
    config.meetingLink ? `- If they prefer online, you may share this link: ${config.meetingLink}` : "",
    "- Never invent prices or features that are not in the product description. If unsure, offer to confirm with the team.",
    "- Do not use emojis.",
  ].filter(Boolean).join("\n");
}

export async function generateSalesReply(
  config: SalesBotConfig,
  lead: SalesLead,
  history: SalesMessage[],
  incomingText: string,
): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: botSystemPrompt(config, lead) },
  ];
  for (const m of history.slice(-16)) {
    messages.push({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.body,
    });
  }
  messages.push({ role: "user", content: incomingText });

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages,
    max_completion_tokens: 500,
  });
  return (
    response.choices[0]?.message?.content?.trim() ||
    "Thank you for your message. A member of our team will follow up with you shortly."
  );
}

export interface Qualification {
  score: number;
  qualification: string;
  pitch: string;
}

export async function qualifyLead(config: SalesBotConfig, lead: SalesLead): Promise<Qualification> {
  const system =
    `You are a B2B sales analyst for ${config.companyName}. Products: ${config.productCatalog}. ` +
    "Given a company lead, assess how good a fit they are for these products. " +
    'Respond ONLY as JSON: {"score": <0-100 integer>, "qualification": "<one sentence on fit and why>", "pitch": "<one sentence tailored opening pitch angle>"}.';
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: leadProfile(lead) },
      ],
      max_completion_tokens: 300,
    });
    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
    return {
      score,
      qualification: String(parsed.qualification ?? "").trim() || "No qualification available.",
      pitch: String(parsed.pitch ?? "").trim() || "",
    };
  } catch (e) {
    console.error("[salesBot] qualifyLead failed:", (e as Error).message);
    throw new Error("AI qualification failed");
  }
}

export interface DiscoveredCandidate {
  companyName: string;
  segment: string;
  location: string;
  rationale: string;
}

// Returns AI-SUGGESTED company names to research. These are prospects to verify,
// NOT confirmed contact records. The UI labels them as such and they enter the
// same manual approval queue.
export async function discoverLeads(
  config: SalesBotConfig,
  segment: string,
  region: string,
  count: number,
): Promise<DiscoveredCandidate[]> {
  const segLabel = SEGMENT_LABELS[segment] ?? "company";
  const system =
    `You are a market-research assistant for ${config.companyName}, which sells: ${config.productCatalog}. ` +
    `Suggest up to ${count} real, well-known categories or named ${segLabel} prospects in ${region} that would plausibly benefit from these products. ` +
    "Only suggest organisations a researcher could realistically verify. Do NOT fabricate phone numbers or emails. " +
    'Respond ONLY as JSON: {"candidates": [{"companyName": "...", "segment": "' + segment + '", "location": "...", "rationale": "<why they fit, one sentence>"}]}.';
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Suggest ${count} ${segLabel} prospects in ${region}.` },
      ],
      max_completion_tokens: 1200,
    });
    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    return list
      .filter((c: any) => c && typeof c.companyName === "string" && c.companyName.trim())
      .slice(0, count)
      .map((c: any) => ({
        companyName: String(c.companyName).trim(),
        segment: typeof c.segment === "string" ? c.segment : segment,
        location: String(c.location ?? region).trim(),
        rationale: String(c.rationale ?? "").trim(),
      }));
  } catch (e) {
    console.error("[salesBot] discoverLeads failed:", (e as Error).message);
    throw new Error("AI discovery failed");
  }
}

// Dependency-free CSV parser. Accepts a header row and maps common column names
// to lead fields. Tolerates quoted values and commas inside quotes.
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur); cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

const FIELD_ALIASES: Record<string, keyof InsertSalesLead> = {
  company: "companyName", "company name": "companyName", companyname: "companyName", name: "companyName", organization: "companyName",
  segment: "segment", category: "segment", industry: "segment", type: "segment",
  contact: "contactName", "contact name": "contactName", contactname: "contactName", person: "contactName",
  title: "contactTitle", position: "contactTitle", role: "contactTitle",
  phone: "phone", tel: "phone", mobile: "phone", telephone: "phone",
  email: "email", "e-mail": "email", mail: "email",
  website: "website", url: "website", site: "website", web: "website",
  location: "location", city: "location", address: "location", region: "location",
  notes: "notes", note: "notes", remarks: "notes", comment: "notes",
};

const SEGMENT_NORMALISE: Record<string, string> = {
  import: "import_export", export: "import_export", "import/export": "import_export",
  "import-export": "import_export", "import export": "import_export", trade: "import_export",
  manufacturing: "manufacturing", manufacturer: "manufacturing", factory: "manufacturing", production: "manufacturing",
  kindergarten: "kindergarten_academy", academy: "kindergarten_academy", school: "kindergarten_academy",
  education: "kindergarten_academy", nursery: "kindergarten_academy",
};

function normaliseSegment(raw?: string): string {
  if (!raw) return "import_export";
  const key = raw.toLowerCase().trim();
  if (["import_export", "manufacturing", "kindergarten_academy", "other"].includes(key)) return key;
  return SEGMENT_NORMALISE[key] ?? "other";
}

export function parseCsvLeads(csv: string): InsertSalesLead[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]).map(h => h.toLowerCase());
  const colMap: (keyof InsertSalesLead | null)[] = header.map(h => FIELD_ALIASES[h] ?? null);
  const hasMappedCompany = colMap.includes("companyName");

  const out: InsertSalesLead[] = [];
  const startIdx = hasMappedCompany ? 1 : 0; // if no recognisable header, treat all rows as company names
  for (let i = startIdx; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const lead: Partial<InsertSalesLead> = { source: "csv" };
    if (hasMappedCompany) {
      cells.forEach((val, idx) => {
        const field = colMap[idx];
        if (!field || !val) return;
        if (field === "segment") lead.segment = normaliseSegment(val);
        else (lead as any)[field] = val;
      });
    } else {
      // No header mapping: first column is the company name.
      if (cells[0]) lead.companyName = cells[0];
      if (cells[1]) lead.phone = cells[1];
      if (cells[2]) lead.email = cells[2];
    }
    if (lead.companyName && lead.companyName.trim()) {
      if (!lead.segment) lead.segment = "import_export";
      out.push(lead as InsertSalesLead);
    }
  }
  return out;
}
