import OpenAI from "openai";
import { storage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function generateAIResponse(userMessage: string): Promise<string> {
  const [shipments, lcs, budgets] = await Promise.all([
    storage.getShipments(),
    storage.getLCs(),
    storage.getBudgetCategories(),
  ]);

  const context = `
You are an AI assistant for an Import Operations Management System. Here is the current data:

SHIPMENTS (${shipments.length} total):
${shipments.map(s => `- ${s.id}: ${s.supplier} from ${s.origin} to ${s.destination}, Status: ${s.status}, ETA: ${s.eta}, Value: ${s.value}`).join("\n")}

LETTERS OF CREDIT (${lcs.length} total):
${lcs.map(lc => `- ${lc.id}: ${lc.bank} for ${lc.beneficiary}, Amount: ${lc.amount}, Status: ${lc.status}, Expiry: ${lc.expiry}`).join("\n")}

BUDGET CATEGORIES (${budgets.length} total):
${budgets.map(b => `- ${b.name}: Allocated $${Number(b.allocated).toLocaleString()}, Spent $${Number(b.spent).toLocaleString()}, Utilization: ${((Number(b.spent)/Number(b.allocated))*100).toFixed(1)}%`).join("\n")}

WHATSAPP: Daily summary reports are automated.
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `${context}\n\nYou are a helpful, concise import operations assistant. Answer questions about shipments, LCs, and budgets using the data above. Be specific and data-driven. Keep responses under 200 words.`,
      },
      {
        role: "user",
        content: userMessage,
      },
    ],
    max_tokens: 400,
  });

  return response.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
}

export async function generateDailySummary(): Promise<string> {
  const [shipments, lcs, budgets] = await Promise.all([
    storage.getShipments(),
    storage.getLCs(),
    storage.getBudgetCategories(),
  ]);

  const inTransit = shipments.filter(s => s.status === "in-transit").length;
  const delayed = shipments.filter(s => s.status === "delayed").length;
  const arrived = shipments.filter(s => s.status === "arrived").length;
  const expiringLCs = lcs.filter(lc => {
    const daysUntil = Math.ceil((new Date(lc.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && lc.status !== "closed";
  });
  const exceededBudgets = budgets.filter(b => Number(b.spent) > Number(b.allocated));

  const summary = `*IMPORTS MANAGER - Daily Summary*
📦 *Shipments*: ${shipments.length} total | ${inTransit} in transit | ${arrived} arrived | ${delayed} delayed
📄 *LCs*: ${lcs.filter(l => l.status !== "closed").length} active${expiringLCs.length > 0 ? ` | ⚠️ ${expiringLCs.length} expiring in 30 days` : ""}
💰 *Budgets*: ${budgets.length} categories${exceededBudgets.length > 0 ? ` | ⚠️ ${exceededBudgets.length} exceeded` : " | All within limits"}
📅 ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

  return summary;
}
