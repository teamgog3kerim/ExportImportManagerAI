import { randomUUID } from "crypto";
import type { ExchangeRate } from "@shared/schema";

const SOURCE_URL = "https://exchange.addisfortune.news/";

const BANK_CODES: Record<string, string> = {
  "Commercial Bank of Ethiopia": "CBE",
  "Awash Bank": "AWB",
  "Dashen Bank": "DAS",
  "Bank of Abyssinia": "BOA",
  "Wegagen Bank": "WEG",
  "Nib International Bank": "NIB",
  "Hibret Bank": "HIB",
  "Cooperative Bank of Oromia": "CBO",
  "Lion International Bank": "LIB",
  "Zemen Bank": "ZEM",
  "Oromia International Bank": "OIB",
  "Berhan International Bank": "BER",
  "Bunna International Bank": "BUN",
  "Abay Bank": "ABA",
  "Addis International Bank": "ADD",
  "Global Bank Ethiopia": "GBE",
  "Enat Bank": "ENA",
  "Amhara Bank": "AMB",
  "Hijra Bank": "HIJ",
  "ZamZam Bank": "ZAM",
  "Goh Betoch Bank": "GOH",
  "Tsehay Bank": "TSE",
  "Siinqee Bank": "SIN",
  "Shabelle Bank": "SHA",
  "Gadaa Bank": "GAD",
  "Ahadu Bank": "AHB",
  "Anbesa Bank": "ANB",
  "Sidama Bank": "SID",
  "Siket Bank": "SKT",
  "Tsedey Bank": "TSD",
  "Development Bank of Ethiopia": "DBE",
  "National Bank of Ethiopia": "NBE",
};

function cleanBankName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+S\.C\.?$/i, "")
    .replace(/\s+SC$/i, "")
    .trim();
}

function codeFor(name: string): string {
  if (BANK_CODES[name]) return BANK_CODES[name];
  // Fallback: first letter of each significant word
  const words = name.replace(/Bank|International|Ethiopia|of|S\.C\.?|SC/gi, "").trim().split(/\s+/);
  return (words.map(w => w[0]).join("") || name.slice(0, 3)).toUpperCase().slice(0, 4);
}

export interface ScrapedRate {
  bankName: string;
  bankCode: string;
  buyingEtb: number;
  sellingEtb: number;
}

export async function scrapeAddisFortuneRates(): Promise<ScrapedRate[]> {
  const res = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ImpExpMidasBot/1.0)" },
  });
  if (!res.ok) throw new Error(`scrape failed: ${res.status}`);
  const html = await res.text();

  // The USD panel is the first "rate-row-1" block set. Each row carries
  // title="<Bank Name>" then two tabular-nums spans (buy then sell).
  const re = /rate-row-1\s[\s\S]*?title="([^"]+)"[\s\S]*?tabular-nums">([0-9.]+)<[\s\S]*?tabular-nums">([0-9.]+)</g;
  const rates: ScrapedRate[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const name = cleanBankName(m[1]);
    const buy = Number(m[2]);
    const sell = Number(m[3]);
    if (!isFinite(buy) || !isFinite(sell) || buy < 1 || sell < 1) continue;
    // Skip National Bank of Ethiopia (reference rate, sell == buy)
    if (name === "National Bank of Ethiopia") continue;
    rates.push({ bankName: name, bankCode: codeFor(name), buyingEtb: buy, sellingEtb: sell });
  }
  return rates;
}

export function scrapedToExchangeRates(scraped: ScrapedRate[]): ExchangeRate[] {
  const now = new Date().toISOString();
  // Cash rates are not published per-bank by Addis Fortune; mirror transaction
  // rates with the typical Ethiopian bank cash differential (cash buy slightly
  // below transaction buy, cash sell slightly above transaction sell).
  return scraped.map(r => ({
    id: randomUUID(),
    bankName: r.bankName,
    bankCode: r.bankCode,
    buyingEtb: r.buyingEtb.toFixed(4),
    sellingEtb: r.sellingEtb.toFixed(4),
    cashBuyingEtb: (r.buyingEtb - 0.05).toFixed(4),
    cashSellingEtb: (r.sellingEtb + 0.10).toFixed(4),
    currency: "USD",
    updatedAt: now,
  }));
}
