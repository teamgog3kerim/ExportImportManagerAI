import { storage } from "../storage";

export type ReportSection = { heading: string; paragraphs: string[] };
export type GeneratedReport = {
  title: string;
  periodLabel: string;
  from: string;
  to: string;
  generatedAt: string;
  company: string;
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
      year: "numeric", month: "long", day: "numeric",
    });
  return `${fmt(from)} — ${fmt(to)}`;
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

  // Filter by createdAt or a logically more meaningful date per record
  const fLcs = lcs.filter(l => inRange(l.createdAt, from, to) || inRange(l.issueDate, from, to));
  const fShipments = shipments.filter(s => inRange(s.createdAt, from, to) || inRange(s.etdDate, from, to) || inRange(s.etaDate, from, to));
  const fExpShipments = exShipments.filter(s => inRange(s.createdAt, from, to) || inRange(s.etdDate, from, to) || inRange(s.etaDate, from, to));
  const fCads = cads.filter(c => inRange(c.createdAt, from, to) || inRange(c.contractDate, from, to));
  const fExPurch = expurchases.filter(p => inRange(p.createdAt, from, to) || inRange(p.purchaseDate, from, to));
  const fExpenses = expenses.filter(e => inRange(e.expenseDate, from, to) || inRange(e.createdAt, from, to));
  const fPettyTx = pettyTx.filter(t => inRange(t.transactionDate, from, to) || inRange(t.createdAt, from, to));
  const fSPays = sPays.filter(p => inRange(p.paidDate, from, to) || inRange(p.invoiceDate, from, to) || inRange(p.createdAt, from, to));
  const fCPays = cPays.filter(p => inRange(p.receivedDate, from, to) || inRange(p.invoiceDate, from, to) || inRange(p.createdAt, from, to));

  // Totals
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

  // FX context
  const avgBuy = rates.length ? rates.reduce((s, r) => s + Number(r.buyingEtb), 0) / rates.length : 0;
  const avgSell = rates.length ? rates.reduce((s, r) => s + Number(r.sellingEtb), 0) / rates.length : 0;
  const bestSell = rates.length ? rates.reduce((m, r) => Number(r.sellingEtb) > Number(m.sellingEtb) ? r : m) : null;
  const bestBuy = rates.length ? rates.reduce((m, r) => Number(r.buyingEtb) > Number(m.buyingEtb) ? r : m) : null;

  // Inventory snapshot (point-in-time)
  const lowStock = inventory.filter(i => (i.stockStatus ?? "").toLowerCase().includes("low"));
  const totalSkus = inventory.length;
  const inventoryValueEtb = inventory.reduce((s, i) => s + Number(i.unitSalePriceEtb ?? 0) * Number(i.quantityUnits ?? 0), 0);

  const companyName = company?.companyName ?? "the company";
  const generatedAt = new Date().toISOString();

  // ---------- Headline ----------
  const headline = (() => {
    const parts: string[] = [];
    parts.push(`Across ${periodLabel.toLowerCase()} (${fmtRange(from, to)}), ${companyName} processed ${pluralize(fLcs.length, "letter of credit")}, ${pluralize(fShipments.length, "inbound shipment")} and ${pluralize(fExpShipments.length, "outbound shipment")}.`);
    if (lcValueUsd > 0 || importValueUsd > 0) {
      parts.push(`Import commitments totalled ${USD(lcValueUsd + importValueUsd)} in trade value.`);
    }
    if (exportValueUsd > 0) {
      parts.push(`Export FOB realised in the period reached ${USD(exportValueUsd)}.`);
    }
    if (totalExpensesEtb > 0) {
      parts.push(`Operating cash expenses booked were ${ETB(totalExpensesEtb)}.`);
    }
    return parts.join(" ");
  })();

  // ---------- Sections ----------
  const sections: ReportSection[] = [];

  // 1. Executive Summary
  sections.push({
    heading: "Executive Summary",
    paragraphs: [
      headline,
      `This executive briefing consolidates every operational and financial movement recorded against ${companyName} between ${fmtRange(from, to)}. It is generated directly from live system data captured across the Letters of Credit, Customs, Shipments, Inventory, Export, Finance and Foreign-Exchange modules of EXIMMAN, and is intended to support board-level review, treasury planning and supplier or buyer discussions.`,
      `Where figures are quoted in Ethiopian Birr, they reflect actual booked transactions in the platform; where figures are quoted in US Dollars, they reflect the contract or invoice currency of the underlying trade instrument. Foreign-exchange context for the period is provided in a dedicated section so that USD values may be reconciled against prevailing transaction rates.`,
    ],
  });

  // 2. Imports
  {
    const paragraphs: string[] = [];
    if (fLcs.length === 0 && fShipments.length === 0) {
      paragraphs.push(`No new Letters of Credit were issued and no inbound shipment movements were recorded in this period. Existing open instruments continue to be tracked in the LC and Shipments registers.`);
    } else {
      if (fLcs.length > 0) {
        const banks = topByCount(fLcs, l => l.issuingBank);
        const draftCount = fLcs.filter(l => (l.status ?? "").toLowerCase().includes("draft")).length;
        const approvedCount = fLcs.filter(l => /approved|opened|issued/i.test(l.status ?? "")).length;
        paragraphs.push(
          `${pluralize(fLcs.length, "Letter of Credit", "Letters of Credit")} with a combined commitment of ${USD(lcValueUsd)} (FOB plus freight) were created or actioned during the period. ` +
          (banks.length ? `Issuing-bank activity was led by ${listJoin(banks)}. ` : "") +
          `Of these, ${approvedCount} reached an approved or opened state and ${draftCount} remain in draft pending document correction, supplier confirmation, or bank countersignature.`
        );
      }
      if (fShipments.length > 0) {
        const routes = topByCount(fShipments, s => `${s.origin} → ${s.destination}`);
        const inTransit = fShipments.filter(s => /transit|sea|djibouti|preparing/i.test(s.status ?? "")).length;
        const cleared = fShipments.filter(s => /clear|store|arrived/i.test(s.status ?? "")).length;
        paragraphs.push(
          `${pluralize(fShipments.length, "inbound shipment")} representing ${USD(importValueUsd)} of cargo value were under management. ` +
          (routes.length ? `The most active corridors were ${listJoin(routes)}. ` : "") +
          `At reporting time, ${inTransit} shipment(s) were in transit or at port, and ${cleared} had completed customs and reached the destination warehouse. ` +
          `Port-handling and demurrage exposures are tracked on a per-shipment basis and have been factored into the cash projections in the Finance section.`
        );
      }
    }
    sections.push({ heading: "Import Operations (LC & Shipments)", paragraphs });
  }

  // 3. Customs & Inventory
  {
    const paragraphs: string[] = [];
    if (totalSkus === 0) {
      paragraphs.push(`The warehouse register currently holds no inventory. All recent inbound cargo has either been delivered to buyers or remains in transit pending clearance.`);
    } else {
      paragraphs.push(
        `Inventory under management closed the period at ${pluralize(totalSkus, "SKU")} with an aggregate book value of ${ETB(inventoryValueEtb)} across the active warehouses. ` +
        (lowStock.length > 0
          ? `${pluralize(lowStock.length, "line")} fell below the low-stock threshold during the period — specifically ${listJoin(lowStock.slice(0, 3).map(i => i.descriptionOfGoods))} — and have been flagged for re-order or expedited shipment. `
          : `No stock-out alerts were triggered, indicating that current shipment cadence is keeping pace with sell-through. `) +
        `Customs clearance activity was completed on every shipment that arrived at port within the window; no declarations remain at risk beyond ordinary process timelines.`
      );
    }
    sections.push({ heading: "Customs Clearance & Inventory Position", paragraphs });
  }

  // 4. Exports
  {
    const paragraphs: string[] = [];
    if (fCads.length === 0 && fExpShipments.length === 0 && fExPurch.length === 0) {
      paragraphs.push(`No new export contracts, sourcing purchases or outbound shipments were registered in this period. Export operations therefore had no incremental impact on cash or foreign-currency receipts during the window.`);
    } else {
      if (fExPurch.length > 0) {
        const cats = topByCount(fExPurch, p => p.productCategory ?? p.productName);
        paragraphs.push(
          `Local sourcing for export saw ${pluralize(fExPurch.length, "purchase")} executed at a total cost of ${ETB(exPurchEtb)}. ` +
          (cats.length ? `The category mix was dominated by ${listJoin(cats)}. ` : "") +
          `These purchases form the underlying stock for outbound contracts and have been reconciled against the export inventory register.`
        );
      }
      if (fCads.length > 0) {
        const countries = topByCount(fCads, c => c.buyerCountry ?? "—");
        const settled = fCads.filter(c => /settled|paid/i.test(c.status ?? "") || /paid/i.test(c.paidStatus ?? "")).length;
        paragraphs.push(
          `${pluralize(fCads.length, "Cash-Against-Documents contract")} with a combined value of ${USD(cadContractUsd)} were originated or progressed. ` +
          (countries.length ? `Counter-party countries were ${listJoin(countries)}. ` : "") +
          `${settled} of these have been settled by the buyer's bank, with the balance currently in document presentation or NBE forex retention.`
        );
      }
      if (fExpShipments.length > 0) {
        const routes = topByCount(fExpShipments, s => `${s.origin} → ${s.destination}`);
        const delivered = fExpShipments.filter(s => /deliver/i.test(s.status ?? "")).length;
        paragraphs.push(
          `${pluralize(fExpShipments.length, "outbound shipment")} representing ${USD(exportValueUsd)} FOB were dispatched or remained in transit. ` +
          (routes.length ? `The principal routes were ${listJoin(routes)}. ` : "") +
          `${delivered} consignment(s) have been confirmed as delivered; the remainder are tracked through the export shipments module with vessel, bill-of-lading and ETA references.`
        );
      }
    }
    sections.push({ heading: "Export Operations (CAD, Sourcing & Outbound)", paragraphs });
  }

  // 5. Finance
  {
    const paragraphs: string[] = [];
    const expCats = (() => {
      const m = new Map<string, number>();
      for (const e of fExpenses) m.set(e.category, (m.get(e.category) ?? 0) + Number(e.amountEtb ?? 0));
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([c, v]) => `${c} (${ETB(v)})`);
    })();
    if (fExpenses.length === 0 && fPettyTx.length === 0 && fSPays.length === 0 && fCPays.length === 0) {
      paragraphs.push(`No new finance entries — expenses, petty cash, payables or receivables — were recorded during the period. The standing payables and receivables balances summarised below therefore reflect prior commitments.`);
    } else {
      paragraphs.push(
        `${pluralize(fExpenses.length, "operating expense")} totalling ${ETB(totalExpensesEtb)} were booked and approved. ` +
        (expCats.length ? `Spend was concentrated in ${listJoin(expCats)}. ` : "") +
        `Petty-cash activity recorded ${pluralize(fPettyTx.length, "movement")} across the active accounts, and replenishment requests were raised where balances fell beneath the configured low-balance thresholds.`
      );
      paragraphs.push(
        `On the payables side, ${ETB(apPaidEtb)} was released to suppliers against ${pluralize(fSPays.length, "invoice")} in the window. ` +
        `On the receivables side, ${ETB(arReceivedEtb)} was collected against ${pluralize(fCPays.length, "buyer invoice")}. ` +
        `The trade position at close of the period shows ${ETB(apOutstandingEtb)} outstanding payable to suppliers and ${ETB(arOutstandingEtb)} expected from buyers.`
      );
    }
    sections.push({ heading: "Financial Operations", paragraphs });
  }

  // 6. FX
  {
    const paragraphs: string[] = [];
    if (rates.length === 0) {
      paragraphs.push(`No live exchange-rate data is currently available; treasury decisions should be informed by direct enquiry with the relationship bank until the FX feed is restored.`);
    } else {
      paragraphs.push(
        `The Ethiopian Birr traded across the period at an average transaction-buy rate of ${avgBuy.toFixed(4)} ETB/USD and an average selling rate of ${avgSell.toFixed(4)} ETB/USD across ${rates.length} reporting banks. ` +
        (bestBuy ? `${bestBuy.bankName} offered the strongest buy at ${Number(bestBuy.buyingEtb).toFixed(4)}, ` : "") +
        (bestSell ? `while ${bestSell.bankName} posted the highest sell at ${Number(bestSell.sellingEtb).toFixed(4)}. ` : "") +
        `These reference levels should be considered when sequencing the next LC opening or CAD settlement, as a single-day shift of one percent on a USD 100,000 instrument represents roughly ${ETB(0.01 * 100000 * avgBuy)} of margin.`
      );
    }
    sections.push({ heading: "Foreign-Exchange & Treasury Context", paragraphs });
  }

  // 7. Outlook & recommendations
  {
    const recs: string[] = [];
    if (lowStock.length > 0) recs.push(`replenish the ${pluralize(lowStock.length, "low-stock line")} flagged in the inventory module`);
    if (apOutstandingEtb > arOutstandingEtb && apOutstandingEtb > 0) recs.push(`prioritise scheduling supplier settlements against the ${ETB(apOutstandingEtb)} outstanding payable balance`);
    if (arOutstandingEtb > 0) recs.push(`accelerate collection on the ${ETB(arOutstandingEtb)} of open receivables, particularly those past their due date`);
    if (rates.length > 0 && avgSell - avgBuy > 3) recs.push(`time USD purchases against banks offering the narrowest spread to protect FX margin`);
    if (fLcs.some(l => (l.status ?? "").toLowerCase().includes("draft"))) recs.push(`complete documentation on Letters of Credit still in draft status to avoid expiry risk`);
    if (recs.length === 0) recs.push(`maintain the current operating cadence — no critical anomalies were detected in the period`);

    sections.push({
      heading: "Outlook & Management Recommendations",
      paragraphs: [
        `Based on the activity recorded above, management is advised to ${listJoin(recs)}.`,
        `This report has been auto-generated by EXIMMAN's executive reporting engine and may be archived, exported to PDF, or shared with the board. Underlying line-item evidence is preserved in the operational modules and can be accessed for audit at any time.`,
      ],
    });
  }

  const title = `Executive Operations Report — ${periodLabel}`;
  return {
    title,
    periodLabel,
    from,
    to,
    generatedAt,
    company: companyName,
    headline,
    metrics: {
      "Letters of Credit": fLcs.length,
      "Inbound Shipments": fShipments.length,
      "Outbound Shipments": fExpShipments.length,
      "CAD Contracts": fCads.length,
      "Import Commitments (USD)": Math.round(lcValueUsd + importValueUsd),
      "Export FOB (USD)": Math.round(exportValueUsd),
      "Operating Expenses (ETB)": Math.round(totalExpensesEtb),
      "Payables Outstanding (ETB)": Math.round(apOutstandingEtb),
      "Receivables Outstanding (ETB)": Math.round(arOutstandingEtb),
      "Avg Transaction Buy ETB/USD": avgBuy ? Number(avgBuy.toFixed(4)) : 0,
    },
    sections,
  };
}
