import OpenAI from "openai";
import { storage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: context },
      { role: "user", content: userMessage },
    ],
    max_tokens: 400,
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
