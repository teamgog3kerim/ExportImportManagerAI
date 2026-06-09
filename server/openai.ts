import OpenAI from "openai";
import { storage } from "./storage";
import type { GeneratedReport } from "./lib/reportNarrator";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Translate the textual fields of a generated report into Amharic, preserving
// every number, currency code (ETB/USD), date and proper noun exactly as-is.
// Returns a new report object; numeric/structural fields are untouched.
export async function translateReportToAmharic(report: GeneratedReport): Promise<GeneratedReport> {
  // Build an ordered list of every translatable string.
  const strings: string[] = [];
  const push = (s: string) => { strings.push(s); return strings.length - 1; };

  const titleIdx = push(report.title);
  const periodIdx = push(report.periodLabel);
  const headlineIdx = push(report.headline);

  const metricKeyIdx: Record<string, number> = {};
  for (const k of Object.keys(report.metrics)) metricKeyIdx[k] = push(k);

  const sectionIdx = report.sections.map(s => ({
    heading: push(s.heading),
    paragraphs: s.paragraphs.map(p => push(p)),
  }));

  const chartIdx = report.charts.map(c => ({
    title: push(c.title),
    data: c.data.map(d => push(d.label)),
  }));

  const system =
    "You are an expert Ethiopian business writer and translator producing an import/export report in Amharic (አማርኛ). " +
    "The user sends a JSON object whose keys are numeric indices and whose values are English strings (titles, headings, narrative paragraphs, metric labels and chart labels). " +
    "For EACH value, write a clear, precise and descriptive Amharic rendering using natural, traditional, dignified Amharic prose — the way a seasoned Ethiopian trade analyst would write a formal report. " +
    "Rules: " +
    "(1) Convey the full meaning faithfully and completely; do NOT translate word-for-word and do NOT add facts that are not implied by the English. You may rephrase for fluency and add connective/descriptive wording so each sentence reads naturally and reads well as narrative. " +
    "(2) Use formal, respectful, traditional Amharic vocabulary and correct grammar; avoid slang, transliterated English words and Anglicisms where a well-established Amharic term exists. " +
    "(3) Keep ALL numbers, currency codes (ETB, USD), percentages, dates and proper nouns (bank names, country names, company names, product names, LC numbers) EXACTLY as written in Latin/Arabic characters — do not translate or transliterate them. " +
    "(4) Keep short labels (metric names, chart titles, headings) concise; expand the longer narrative paragraphs into flowing, descriptive sentences. " +
    "(5) Return EVERY key from the input mapped to its Amharic rendering, preserving the same indices. " +
    'Respond ONLY with a JSON object of the form {"items": {"0": "…", "1": "…"}} containing one entry for every input index.';

  const inputMap: Record<string, string> = {};
  strings.forEach((s, i) => { inputMap[String(i)] = s; });

  let map: Record<string, string> = {};
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify({ items: inputMap }) },
      ],
      max_completion_tokens: 16000,
    });
    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    map = (parsed.items && typeof parsed.items === "object") ? parsed.items : parsed;
  } catch (e) {
    console.error("Amharic translation failed:", e);
    throw new Error("Amharic translation failed");
  }

  // Per-item fallback to the original English if a segment is missing, so a
  // partial model response never blanks out the report.
  const translatedCount = strings.filter((_s, i) => typeof map[String(i)] === "string" && map[String(i)].trim().length > 0).length;
  if (translatedCount === 0) {
    throw new Error("Amharic translation returned no content");
  }
  const t = (i: number) => {
    const v = map[String(i)];
    return typeof v === "string" && v.trim().length > 0 ? v : strings[i];
  };

  const metrics: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(report.metrics)) metrics[t(metricKeyIdx[k])] = v;

  return {
    ...report,
    title: t(titleIdx),
    periodLabel: t(periodIdx),
    headline: t(headlineIdx),
    metrics,
    sections: report.sections.map((s, i) => ({
      heading: t(sectionIdx[i].heading),
      paragraphs: s.paragraphs.map((_p, j) => t(sectionIdx[i].paragraphs[j])),
    })),
    charts: report.charts.map((c, i) => ({
      ...c,
      title: t(chartIdx[i].title),
      data: c.data.map((d, j) => ({ ...d, label: t(chartIdx[i].data[j]) })),
    })),
  };
}

export async function generateAIResponse(userMessage: string): Promise<string> {
  const [shipments, lcs, inventory, rates] = await Promise.all([
    storage.getShipments(), storage.getLCs(), storage.getInventory(), storage.getExchangeRates()
  ]);

  const bestBuy = rates.length > 0 ? rates.reduce((max, r) => Number(r.buyingEtb) > Number(max.buyingEtb) ? r : max) : null;

  const context = `
You are an AI assistant for MY IMP-EXP MANAGER, an Ethiopian import/export management platform.

CURRENT DATA:
- Shipments (${shipments.length}): ${shipments.map(s => `${s.origin}→${s.destination} (${s.status})`).join(", ")}
- Letters of Credit (${lcs.length}): ${lcs.map(lc => `${lc.lcNumber} $${lc.fobValueUsd} ${lc.status}`).join(", ")}
- Inventory (${inventory.length} items): ${inventory.map(i => `${i.descriptionOfGoods} qty:${i.quantityUnits} ${i.stockStatus}`).join(", ")}
- Best USD/ETB Buy Rate: ${bestBuy?.buyingEtb ?? "N/A"} (${bestBuy?.bankName ?? "N/A"})
- Currency: Ethiopian Birr (ETB), Djibouti port routing

You are an Ethiopian trade expert. Answer concisely about import/export operations, LC management, customs duties, exchange rates, and logistics. Keep responses under 200 words.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: context },
      { role: "user", content: userMessage },
    ],
    max_completion_tokens: 400,
  });

  return response.choices[0]?.message?.content || "I couldn't generate a response.";
}

export async function generateDailySummary(): Promise<string> {
  const [shipments, lcs] = await Promise.all([storage.getShipments(), storage.getLCs()]);
  const inTransit = shipments.filter(s => s.status.includes("Transit") || s.status.includes("Djibouti")).length;
  const expiringLCs = lcs.filter(lc => {
    const days = Math.ceil((new Date(lc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 30 && lc.status !== "Closed";
  });
  return `*MY IMP-EXP MANAGER - Daily Summary*\n📦 Shipments: ${shipments.length} total | ${inTransit} in transit\n📄 LCs: ${lcs.filter(l => l.status !== "Closed").length} active${expiringLCs.length > 0 ? ` | ⚠️ ${expiringLCs.length} expiring soon` : ""}\n📅 ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;
}
