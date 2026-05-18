import { storage } from "../storage";

export type ReportSection = { heading: string; paragraphs: string[] };
export type GeneratedReport = {
  title: string;
  periodLabel: string;
  from: string;
  to: string;
  generatedAt: string;
  company: string;
  compact: boolean;
  headline: string;
  metrics: Record<string, string | number>;
  sections: ReportSection[];
};

const ETB = (n: number) =>
  `ETB ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const USD = (n: number) =>
  `USD ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function inRange(dateStr: string | null | undefined, from: string, to: string) {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= from && d <= to;
}
function fmtRange(from: string, to: string) {
  const fmt = (s: string) =>
    new Date(s + "T00:00:00").toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  return from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`;
}
function pluralize(n: number, singular: string, plural?: string) {
  return `${n} ${n === 1 ? singular : (plural ?? singular + "s")}`;
}
function listJoin(items: string[]) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
function topByCount<T>(arr: T[], key: (x: T) => string, limit = 3): string[] {
  const m = new Map<string, number>();
  for (const x of arr) {
    const k = key(x);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
    .map(([k, c]) => `${k} (${c})`);
}
function daysBetween(from: string, to: string) {
  const a = new Date(from + "T00:00:00Z").getTime();
  const b = new Date(to + "T00:00:00Z").getTime();
  return Math.max(0, Math.round((b - a) / 86400000)) + 1;
}

export async function buildReport(
  from: string,
  to: string,
  periodLabel: string,
): Promise<GeneratedReport> {
  const [
    lcs, shipments, inventory, rates,
    expurchases, cads, exShipments,
    expenses, pettyTx, sPays, cPays,
    company,
  ] = await Promise.all([
    storage.getLCs(),
    storage.getShipments(),
    storage.getInventory(),
    storage.getExchangeRates(),
    storage.getExportPurchases(),
    storage.getCads(),
    storage.getExportShipments(),
    storage.getExpenses(),
    storage.getPettyCashTransactions(),
    storage.getSupplierPayments(),
    storage.getCustomerPayments(),
    storage.getCompanySettings(),
  ]);

  const fLcs = lcs.filter(l => inRange(l.createdAt, from, to) || inRange(l.issueDate, from, to));
  const fShipments = shipments.filter(s => inRange(s.createdAt, from, to) || inRange(s.etdDate, from, to) || inRange(s.etaDate, from, to));
  const fExpShipments = exShipments.filter(s => inRange(s.createdAt, from, to) || inRange(s.etdDate, from, to) || inRange(s.etaDate, from, to));
  const fCads = cads.filter(c => inRange(c.createdAt, from, to) || inRange(c.contractDate, from, to));
  const fExPurch = expurchases.filter(p => inRange(p.createdAt, from, to) || inRange(p.purchaseDate, from, to));
  const fExpenses = expenses.filter(e => inRange(e.expenseDate, from, to) || inRange(e.createdAt, from, to));
  const fPettyTx = pettyTx.filter(t => inRange(t.transactionDate, from, to) || inRange(t.createdAt, from, to));
  const fSPays = sPays.filter(p => inRange(p.paidDate, from, to) || inRange(p.invoiceDate, from, to) || inRange(p.createdAt, from, to));
  const fCPays = cPays.filter(p => inRange(p.receivedDate, from, to) || inRange(p.invoiceDate, from, to) || inRange(p.createdAt, from, to));

  const lcValueUsd = fLcs.reduce((s, l) => s + Number(l.fobValueUsd ?? 0) + Number(l.freightValueUsd ?? 0), 0);
  const importValueUsd = fShipments.reduce((s, x) => s + Number(x.totalValueUsd ?? 0), 0);
  const exportValueUsd = fExpShipments.reduce((s, x) => s + Number(x.fobValueUsd ?? 0), 0);
  const cadContractUsd = fCads.reduce((s, x) => s + Number(x.totalContractUsd ?? 0), 0);
  const exPurchEtb = fExPurch.reduce((s, x) => s + Number(x.totalCostEtb ?? 0), 0);
  const totalExpensesEtb = fExpenses.reduce((s, x) => s + Number(x.amountEtb ?? 0), 0);
  const apOutstandingEtb = fSPays.reduce((s, x) => s + (Number(x.totalAmountEtb ?? 0) - Number(x.paidAmountEtb ?? 0)), 0);
  const arOutstandingEtb = fCPays.reduce((s, x) => s + (Number(x.totalAmountEtb ?? 0) - Number(x.receivedAmountEtb ?? 0)), 0);
  const apPaidEtb = fSPays.reduce((s, x) => s + Number(x.paidAmountEtb ?? 0), 0);
  const arReceivedEtb = fCPays.reduce((s, x) => s + Number(x.receivedAmountEtb ?? 0), 0);

  const avgBuy = rates.length ? rates.reduce((s, r) => s + Number(r.buyingEtb), 0) / rates.length : 0;
  const avgSell = rates.length ? rates.reduce((s, r) => s + Number(r.sellingEtb), 0) / rates.length : 0;
  const bestSell = rates.length ? rates.reduce((m, r) => Number(r.sellingEtb) > Number(m.sellingEtb) ? r : m) : null;
  const bestBuy = rates.length ? rates.reduce((m, r) => Number(r.buyingEtb) > Number(m.buyingEtb) ? r : m) : null;

  const lowStock = inventory.filter(i => (i.stockStatus ?? "").toLowerCase().includes("low"));
  const totalSkus = inventory.length;
  const inventoryValueEtb = inventory.reduce((s, i) => s + Number(i.unitSalePriceEtb ?? 0) * Number(i.quantityUnits ?? 0), 0);

  const companyName = company?.companyName ?? "the company";
  const generatedAt = new Date().toISOString();
  const periodDays = daysBetween(from, to);
  const compact = periodDays <= 7;

  // ---------- Headline (single sentence) ----------
  const headlineBits: string[] = [];
  headlineBits.push(`${pluralize(fLcs.length, "LC")}, ${pluralize(fShipments.length, "inbound shipment")}, ${pluralize(fExpShipments.length, "export shipment")}, ${pluralize(fCads.length, "CAD contract")}.`);
  if (lcValueUsd + importValueUsd > 0) headlineBits.push(`Imports ${USD(lcValueUsd + importValueUsd)}.`);
  if (exportValueUsd > 0) headlineBits.push(`Exports ${USD(exportValueUsd)} FOB.`);
  if (totalExpensesEtb > 0) headlineBits.push(`Opex ${ETB(totalExpensesEtb)}.`);
  const headline = headlineBits.join(" ");

  const sections: ReportSection[] = [];

  // 1. Summary — always 1 short paragraph
  sections.push({
    heading: "Summary",
    paragraphs: [
      compact
        ? `${companyName} over ${fmtRange(from, to)}: ${headline}`
        : `Over ${fmtRange(from, to)}, ${companyName} recorded the following operational and financial activity. ${headline} Detail by module follows below; all figures are drawn from live EXIMMAN records.`,
    ],
  });

  // 2. Imports — terse
  {
    const lines: string[] = [];
    if (fLcs.length === 0 && fShipments.length === 0) {
      lines.push(`No new LCs opened and no inbound shipment movements recorded.`);
    } else {
      if (fLcs.length > 0) {
        const banks = topByCount(fLcs, l => l.issuingBank, 2);
        const drafts = fLcs.filter(l => /draft/i.test(l.status ?? "")).length;
        lines.push(
          `${pluralize(fLcs.length, "LC")} totalling ${USD(lcValueUsd)} (FOB + freight)` +
          (banks.length ? `, led by ${listJoin(banks)}` : "") +
          (drafts > 0 ? `; ${drafts} still in draft.` : `.`)
        );
      }
      if (fShipments.length > 0) {
        const routes = topByCount(fShipments, s => `${s.origin}→${s.destination}`, 2);
        const inTransit = fShipments.filter(s => /transit|sea|djibouti|preparing/i.test(s.status ?? "")).length;
        const cleared = fShipments.filter(s => /clear|store|arrived/i.test(s.status ?? "")).length;
        lines.push(
          `${pluralize(fShipments.length, "inbound shipment")} (${USD(importValueUsd)} cargo)` +
          (routes.length ? ` on ${listJoin(routes)}` : "") +
          `; ${inTransit} in transit, ${cleared} cleared.`
        );
      }
    }
    sections.push({ heading: "Imports", paragraphs: [lines.join(" ")] });
  }

  // 3. Inventory — single sentence
  {
    const text = totalSkus === 0
      ? `Warehouse register is empty; nothing in stock at close.`
      : `${pluralize(totalSkus, "SKU")} on hand at ${ETB(inventoryValueEtb)} book value` +
        (lowStock.length > 0
          ? `; ${pluralize(lowStock.length, "line")} below low-stock (${listJoin(lowStock.slice(0, 2).map(i => i.descriptionOfGoods))}).`
          : `; no low-stock alerts.`);
    sections.push({ heading: "Inventory & Customs", paragraphs: [text] });
  }

  // 4. Exports — terse
  {
    const lines: string[] = [];
    if (fCads.length === 0 && fExpShipments.length === 0 && fExPurch.length === 0) {
      lines.push(`No export contracts, sourcing or outbound shipments in this period.`);
    } else {
      if (fExPurch.length > 0) lines.push(`Sourcing: ${pluralize(fExPurch.length, "purchase")} at ${ETB(exPurchEtb)}.`);
      if (fCads.length > 0) {
        const countries = topByCount(fCads, c => c.buyerCountry ?? "—", 2);
        const settled = fCads.filter(c => /settled|paid/i.test(c.status ?? "") || /paid/i.test(c.paidStatus ?? "")).length;
        lines.push(
          `${pluralize(fCads.length, "CAD")} totalling ${USD(cadContractUsd)}` +
          (countries.length ? ` to ${listJoin(countries)}` : "") +
          `; ${settled} settled.`
        );
      }
      if (fExpShipments.length > 0) {
        const delivered = fExpShipments.filter(s => /deliver/i.test(s.status ?? "")).length;
        lines.push(`${pluralize(fExpShipments.length, "outbound shipment")} (${USD(exportValueUsd)} FOB); ${delivered} delivered.`);
      }
    }
    sections.push({ heading: "Exports", paragraphs: [lines.join(" ")] });
  }

  // 5. Finance — 1-2 short lines
  {
    const lines: string[] = [];
    if (fExpenses.length === 0 && fPettyTx.length === 0 && fSPays.length === 0 && fCPays.length === 0) {
      lines.push(`No finance entries in this period.`);
    } else {
      const expCats = (() => {
        const m = new Map<string, number>();
        for (const e of fExpenses) m.set(e.category, (m.get(e.category) ?? 0) + Number(e.amountEtb ?? 0));
        return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2)
          .map(([c, v]) => `${c} ${ETB(v)}`);
      })();
      if (fExpenses.length > 0) lines.push(`${pluralize(fExpenses.length, "expense")} ${ETB(totalExpensesEtb)}` + (expCats.length ? ` (${listJoin(expCats)})` : "") + `.`);
      if (fPettyTx.length > 0) lines.push(`${pluralize(fPettyTx.length, "petty-cash movement")}.`);
      if (fSPays.length > 0 || fCPays.length > 0) {
        lines.push(`AP paid ${ETB(apPaidEtb)}, AR received ${ETB(arReceivedEtb)}; outstanding AP ${ETB(apOutstandingEtb)}, AR ${ETB(arOutstandingEtb)}.`);
      }
    }
    sections.push({ heading: "Finance", paragraphs: [lines.join(" ")] });
  }

  // 6. FX — only when not compact OR when no other content trimmed
  if (!compact) {
    const text = rates.length === 0
      ? `FX feed unavailable; confirm rates with relationship bank.`
      : `Avg ${avgBuy.toFixed(2)} buy / ${avgSell.toFixed(2)} sell ETB/USD across ${rates.length} banks` +
        (bestBuy ? `; best buy ${bestBuy.bankName} ${Number(bestBuy.buyingEtb).toFixed(2)}` : "") +
        (bestSell ? `, best sell ${bestSell.bankName} ${Number(bestSell.sellingEtb).toFixed(2)}.` : ".");
    sections.push({ heading: "Foreign Exchange", paragraphs: [text] });
  }

  // 7. Outlook — terse recommendations
  {
    const recs: string[] = [];
    if (lowStock.length > 0) recs.push(`replenish ${pluralize(lowStock.length, "low-stock line")}`);
    if (apOutstandingEtb > arOutstandingEtb && apOutstandingEtb > 0) recs.push(`schedule supplier settlements (${ETB(apOutstandingEtb)} outstanding)`);
    if (arOutstandingEtb > 0) recs.push(`collect ${ETB(arOutstandingEtb)} open receivables`);
    if (!compact && rates.length > 0 && avgSell - avgBuy > 3) recs.push(`time USD purchases to narrow-spread banks`);
    if (fLcs.some(l => /draft/i.test(l.status ?? ""))) recs.push(`finalise draft LCs to avoid expiry`);
    if (recs.length === 0) recs.push(`maintain current operating cadence — no anomalies detected`);
    sections.push({
      heading: "Outlook",
      paragraphs: [`Recommended actions: ${listJoin(recs)}.`],
    });
  }

  const title = `Operations Report — ${periodLabel}`;
  return {
    title,
    periodLabel,
    from,
    to,
    generatedAt,
    company: companyName,
    compact,
    headline,
    metrics: {
      "LCs": fLcs.length,
      "Inbound": fShipments.length,
      "Outbound": fExpShipments.length,
      "CADs": fCads.length,
      "Imports (USD)": Math.round(lcValueUsd + importValueUsd),
      "Exports FOB (USD)": Math.round(exportValueUsd),
      "Opex (ETB)": Math.round(totalExpensesEtb),
      "AP Out. (ETB)": Math.round(apOutstandingEtb),
      "AR Out. (ETB)": Math.round(arOutstandingEtb),
      "Avg Buy ETB/USD": avgBuy ? Number(avgBuy.toFixed(2)) : 0,
    },
    sections,
  };
}
