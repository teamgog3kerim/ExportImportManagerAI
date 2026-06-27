import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { generateAIResponse, generateDailySummary } from "./openai";
import { insertExportPurchaseSchema, insertCadSchema, insertExportShipmentSchema, insertSupplierSchema, insertBuyerSchema, insertExpenseSchema, insertPettyCashAccountSchema, insertPettyCashTransactionSchema, insertSupplierPaymentSchema, insertCustomerPaymentSchema, updateSupplierPaymentSchema, updateCustomerPaymentSchema, insertSaleSchema, insertSalesLeadSchema, insertSalesMeetingSchema, updateSalesBotConfigSchema } from "@shared/schema";
import { isTelegramConfigured, getBotInfo, sendTelegramMessage, setTelegramWebhook, getWebhookSecret, type TelegramUpdate } from "./telegram";
import { generateSalesReply, qualifyLead, discoverLeads, parseCsvLeads } from "./salesBot";
import { scrapeAddisFortuneRates, scrapedToExchangeRates } from "./lib/rateScraper";
import { buildReport } from "./lib/reportNarrator";
import { apiAccessGuard, ensureBootstrapAdmin, registerAuthRoutes } from "./auth";
import { runMigrations, verifyAuthSchema } from "./migrate";

let lastScrapeAt = 0;
let lastScrapeOk = false;
let scrapeInFlight = false;
const MIN_BANKS = 20;
async function refreshLiveRates() {
  if (scrapeInFlight) return;
  scrapeInFlight = true;
  try {
    const scraped = await scrapeAddisFortuneRates();
    // Validate completeness + sanity before swapping in
    const valid = scraped.filter(r => r.sellingEtb >= r.buyingEtb && r.buyingEtb > 50);
    const uniqueCodes = new Set(valid.map(r => r.bankCode));
    if (valid.length < MIN_BANKS || uniqueCodes.size !== valid.length) {
      throw new Error(`partial/invalid scrape: ${valid.length} rows, ${uniqueCodes.size} unique codes`);
    }
    await storage.setExchangeRates(scrapedToExchangeRates(valid));
    lastScrapeAt = Date.now();
    lastScrapeOk = true;
    console.log(`[rates] Refreshed ${valid.length} bank rates from Addis Fortune`);
  } catch (e) {
    lastScrapeOk = false;
    console.warn("[rates] scrape failed:", (e as Error).message);
  } finally {
    scrapeInFlight = false;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply checked-in SQL migrations (users + session tables), then verify the
  // auth schema is intact before anything touches it. db:push is broken here,
  // so migrations are the versioned, repeatable source of truth.
  await runMigrations();
  await verifyAuthSchema();

  // Ensure the bootstrap administrator account exists.
  await ensureBootstrapAdmin();

  // Global access-control guard for all /api routes (skips /api/auth/*).
  // Registered before route handlers so req.currentUser is populated.
  app.use(apiAccessGuard());

  // Auth endpoints (public) + admin user-management endpoints.
  registerAuthRoutes(app);

  // Dashboard
  app.get("/api/dashboard", async (_req, res) => {
    const [lcs, shipments, inventory, rates] = await Promise.all([
      storage.getLCs(), storage.getShipments(), storage.getInventory(), storage.getExchangeRates()
    ]);
    const activeLCs = lcs.filter(lc => lc.status !== "Closed" && lc.status !== "Settled");
    const totalRevenue = inventory.reduce((sum, i) => sum + (Number(i.unitSalePriceEtb) * Number(i.quantityUnits)), 0);
    const bestBuy = rates.length > 0 ? rates.reduce((max, r) => Number(r.buyingEtb) > Number(max.buyingEtb) ? r : max) : null;
    const bestSell = rates.length > 0 ? rates.reduce((max, r) => Number(r.sellingEtb) > Number(max.sellingEtb) ? r : max) : null;
    const customsAtRisk = shipments.filter(s => s.status.includes("Djibouti") || s.status.includes("Risk")).length;

    res.json({
      totalShipments: shipments.length,
      activeLCs: activeLCs.length,
      customsAtRisk,
      totalRevenueEtb: totalRevenue,
      recentShipments: shipments.slice(0, 5),
      bestBuyRate: bestBuy,
      bestSellRate: bestSell,
      allRates: rates,
      productMix: [
        { category: "Textiles", pct: 45 },
        { category: "Electronics", pct: 30 },
        { category: "Machinery", pct: 15 },
        { category: "Chemicals", pct: 10 },
      ],
      cashFlowData: [
        { week: "Week 1", inflow: 35000, outflow: 28000 },
        { week: "Week 2", inflow: 42000, outflow: 38000 },
        { week: "Week 3", inflow: 55000, outflow: 41000 },
        { week: "Week 4", inflow: 63000, outflow: 45000 },
      ],
      tradeVolumeData: [
        { month: "Jan", value: 250 },
        { month: "Feb", value: 180 },
        { month: "Mar", value: 320 },
        { month: "Apr", value: 480 },
        { month: "May", value: 750 },
        { month: "Jun", value: 920 },
      ],
    });
  });

  // LCs
  app.get("/api/lcs", async (_req, res) => res.json(await storage.getLCs()));
  app.get("/api/lcs/:id", async (req, res) => {
    const lc = await storage.getLC(req.params.id);
    if (!lc) return res.status(404).json({ message: "LC not found" });
    res.json(lc);
  });
  app.post("/api/lcs", async (req, res) => {
    try {
      const lc = await storage.createLC(req.body);
      res.status(201).json(lc);
    } catch (e) { res.status(400).json({ message: String(e) }); }
  });
  app.patch("/api/lcs/:id", async (req, res) => {
    const updated = await storage.updateLC(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "LC not found" });
    res.json(updated);
  });
  app.delete("/api/lcs/:id", async (req, res) => {
    const deleted = await storage.deleteLC(req.params.id);
    if (!deleted) return res.status(404).json({ message: "LC not found" });
    res.status(204).end();
  });

  // Shipments
  app.get("/api/shipments", async (_req, res) => res.json(await storage.getShipments()));
  app.get("/api/shipments/:id", async (req, res) => {
    const s = await storage.getShipment(req.params.id);
    if (!s) return res.status(404).json({ message: "Shipment not found" });
    res.json(s);
  });
  app.post("/api/shipments", async (req, res) => {
    try {
      const s = await storage.createShipment(req.body);
      res.status(201).json(s);
    } catch (e) { res.status(400).json({ message: String(e) }); }
  });
  app.patch("/api/shipments/:id", async (req, res) => {
    const updated = await storage.updateShipment(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Shipment not found" });
    res.json(updated);
  });
  app.delete("/api/shipments/:id", async (req, res) => {
    const deleted = await storage.deleteShipment(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Shipment not found" });
    res.status(204).end();
  });

  // Inventory
  app.get("/api/inventory", async (_req, res) => res.json(await storage.getInventory()));
  app.post("/api/inventory", async (req, res) => {
    try {
      const item = await storage.createInventoryItem(req.body);
      res.status(201).json(item);
    } catch (e) { res.status(400).json({ message: String(e) }); }
  });
  app.patch("/api/inventory/:id", async (req, res) => {
    const updated = await storage.updateInventoryItem(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Inventory item not found" });
    res.json(updated);
  });
  app.delete("/api/inventory/:id", async (req, res) => {
    const deleted = await storage.deleteInventoryItem(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Inventory item not found" });
    res.status(204).end();
  });

  // Sales (Import — selling cleared inventory by serial number)
  app.get("/api/sales/available-serials", async (_req, res) => res.json(await storage.getAvailableSerials()));
  app.get("/api/sales", async (_req, res) => res.json(await storage.getSales()));
  app.get("/api/sales/:id", async (req, res) => {
    const sale = await storage.getSale(req.params.id);
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    res.json(sale);
  });
  app.post("/api/sales", async (req, res) => {
    try {
      const parsed = insertSaleSchema.parse(req.body);
      const sale = await storage.createSale(parsed);
      res.status(201).json(sale);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: e.errors });
      res.status(400).json({ message: e instanceof Error ? e.message : "Could not record sale" });
    }
  });
  app.patch("/api/sales/:id", async (req, res) => {
    try {
      const parsed = insertSaleSchema.partial().parse(req.body);
      const updated = await storage.updateSale(req.params.id, parsed);
      if (!updated) return res.status(404).json({ message: "Sale not found" });
      res.json(updated);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Validation failed", errors: e.errors });
      res.status(400).json({ message: e instanceof Error ? e.message : "Could not update sale" });
    }
  });
  app.delete("/api/sales/:id", async (req, res) => {
    const deleted = await storage.deleteSale(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Sale not found" });
    res.status(204).end();
  });

  // Exchange Rates — scraped live from exchange.addisfortune.news every 5 minutes
  refreshLiveRates();
  setInterval(refreshLiveRates, 5 * 60 * 1000);
  app.get("/api/exchange-rates", async (_req, res) => {
    const rates = await storage.getExchangeRates();
    const txnBuys = rates.map(r => Number(r.buyingEtb));
    const txnSells = rates.map(r => Number(r.sellingEtb));
    const cashBuys = rates.map(r => Number(r.cashBuyingEtb));
    const cashSells = rates.map(r => Number(r.cashSellingEtb));
    const avg = (a: number[]) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
    const bestTxnBuy = rates.length ? rates.reduce((m, r) => Number(r.buyingEtb) > Number(m.buyingEtb) ? r : m) : null;
    const bestCashBuy = rates.length ? rates.reduce((m, r) => Number(r.cashBuyingEtb) > Number(m.cashBuyingEtb) ? r : m) : null;
    const lowestSell = rates.length ? rates.reduce((m, r) => Number(r.sellingEtb) < Number(m.sellingEtb) ? r : m) : null;
    const spread = avg(txnSells) - avg(txnBuys);
    const insights = [
      `Market mid-rate (transaction) sits near ETB ${avg(txnBuys).toFixed(2)} / USD across ${rates.length} banks.`,
      `${bestTxnBuy?.bankName ?? "—"} leads transaction buying at ETB ${Number(bestTxnBuy?.buyingEtb ?? 0).toFixed(4)}.`,
      `${bestCashBuy?.bankName ?? "—"} offers the best cash buying rate (ETB ${Number(bestCashBuy?.cashBuyingEtb ?? 0).toFixed(4)}).`,
      `${lowestSell?.bankName ?? "—"} has the cheapest transaction selling at ETB ${Number(lowestSell?.sellingEtb ?? 0).toFixed(4)}.`,
      `Average bank spread is ETB ${spread.toFixed(4)} — book FX early to lock in tighter pricing.`,
      `Rates sourced live from exchange.addisfortune.news, refreshed every 5 minutes.`,
    ];
    res.json({
      rates,
      lastUpdated: lastScrapeAt ? new Date(lastScrapeAt).toISOString() : null,
      source: "exchange.addisfortune.news",
      live: lastScrapeOk,
      refreshIntervalMs: 5 * 60 * 1000,
      stats: {
        avgTxnBuy: avg(txnBuys), avgTxnSell: avg(txnSells),
        avgCashBuy: avg(cashBuys), avgCashSell: avg(cashSells),
        bestTxnBuy, bestCashBuy, lowestSell, spread,
      },
      insight: insights[Math.floor(Date.now() / (5 * 60 * 1000)) % insights.length],
    });
  });

  // Banks
  app.get("/api/settings/banks", async (_req, res) => res.json(await storage.getBanks()));
  app.post("/api/settings/banks", async (req, res) => {
    try {
      const bank = await storage.createBank(req.body);
      res.status(201).json(bank);
    } catch (e) { res.status(400).json({ message: String(e) }); }
  });
  app.delete("/api/settings/banks/:id", async (req, res) => {
    await storage.deleteBank(req.params.id);
    res.status(204).end();
  });

  // Suppliers
  app.get("/api/settings/suppliers", async (_req, res) => res.json(await storage.getSuppliers()));
  app.post("/api/settings/suppliers", async (req, res) => {
    const parsed = insertSupplierSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid supplier", errors: parsed.error.flatten() });
    try {
      const s = await storage.createSupplier(parsed.data);
      res.status(201).json(s);
    } catch (e) { res.status(400).json({ message: String(e) }); }
  });
  app.patch("/api/settings/suppliers/:id", async (req, res) => {
    const parsed = insertSupplierSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid supplier", errors: parsed.error.flatten() });
    try {
      const updated = await storage.updateSupplier(req.params.id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Supplier not found" });
      res.json(updated);
    } catch (e) { res.status(400).json({ message: String(e) }); }
  });
  app.delete("/api/settings/suppliers/:id", async (req, res) => {
    await storage.deleteSupplier(req.params.id);
    res.status(204).end();
  });

  // Buyers
  app.get("/api/settings/buyers", async (_req, res) => res.json(await storage.getBuyers()));
  app.post("/api/settings/buyers", async (req, res) => {
    const parsed = insertBuyerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid buyer", errors: parsed.error.flatten() });
    try {
      const b = await storage.createBuyer(parsed.data);
      res.status(201).json(b);
    } catch (e) { res.status(400).json({ message: String(e) }); }
  });
  app.patch("/api/settings/buyers/:id", async (req, res) => {
    const parsed = insertBuyerSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid buyer", errors: parsed.error.flatten() });
    try {
      const updated = await storage.updateBuyer(req.params.id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Buyer not found" });
      res.json(updated);
    } catch (e) { res.status(400).json({ message: String(e) }); }
  });
  app.delete("/api/settings/buyers/:id", async (req, res) => {
    await storage.deleteBuyer(req.params.id);
    res.status(204).end();
  });

  // Certifications
  app.get("/api/settings/certifications", async (_req, res) => res.json(await storage.getCertifications()));
  app.post("/api/settings/certifications", async (req, res) => {
    try {
      const c = await storage.createCertification(req.body);
      res.status(201).json(c);
    } catch (e) { res.status(400).json({ message: String(e) }); }
  });
  app.delete("/api/settings/certifications/:id", async (req, res) => {
    await storage.deleteCertification(req.params.id);
    res.status(204).end();
  });

  // Company Settings
  app.get("/api/settings/company", async (_req, res) => res.json(await storage.getCompanySettings()));
  app.patch("/api/settings/company", async (req, res) => {
    const s = await storage.upsertCompanySettings(req.body);
    res.json(s);
  });

  // Notification Settings
  app.get("/api/settings/notifications", async (_req, res) => res.json(await storage.getNotificationSettings()));
  app.patch("/api/settings/notifications", async (req, res) => {
    const s = await storage.upsertNotificationSettings(req.body);
    res.json(s);
  });

  // === Export Purchases ===
  app.get("/api/export/purchases", async (_req, res) => res.json(await storage.getExportPurchases()));
  app.get("/api/export/purchases/:id", async (req, res) => {
    const p = await storage.getExportPurchase(req.params.id);
    if (!p) return res.status(404).json({ message: "Purchase not found" });
    res.json(p);
  });
  app.post("/api/export/purchases", async (req, res) => {
    const parsed = insertExportPurchaseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid purchase", errors: parsed.error.flatten() });
    res.status(201).json(await storage.createExportPurchase(parsed.data));
  });
  app.patch("/api/export/purchases/:id", async (req, res) => {
    const parsed = insertExportPurchaseSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid purchase update", errors: parsed.error.flatten() });
    const u = await storage.updateExportPurchase(req.params.id, parsed.data);
    if (!u) return res.status(404).json({ message: "Purchase not found" });
    res.json(u);
  });
  app.delete("/api/export/purchases/:id", async (req, res) => {
    const existing = await storage.getExportPurchase(req.params.id);
    if (!existing) return res.status(404).json({ message: "Purchase not found" });
    await storage.deleteExportPurchase(req.params.id);
    res.status(204).end();
  });

  // === CADs ===
  app.get("/api/export/cads", async (_req, res) => res.json(await storage.getCads()));
  app.get("/api/export/cads/:id", async (req, res) => {
    const c = await storage.getCad(req.params.id);
    if (!c) return res.status(404).json({ message: "CAD not found" });
    res.json(c);
  });
  app.post("/api/export/cads", async (req, res) => {
    const parsed = insertCadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid CAD", errors: parsed.error.flatten() });
    res.status(201).json(await storage.createCad(parsed.data));
  });
  app.patch("/api/export/cads/:id", async (req, res) => {
    const parsed = insertCadSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid CAD update", errors: parsed.error.flatten() });
    const u = await storage.updateCad(req.params.id, parsed.data);
    if (!u) return res.status(404).json({ message: "CAD not found" });
    res.json(u);
  });
  app.delete("/api/export/cads/:id", async (req, res) => {
    const existing = await storage.getCad(req.params.id);
    if (!existing) return res.status(404).json({ message: "CAD not found" });
    await storage.deleteCad(req.params.id);
    res.status(204).end();
  });

  // === Export Shipments ===
  app.get("/api/export/shipments", async (_req, res) => res.json(await storage.getExportShipments()));
  app.get("/api/export/shipments/:id", async (req, res) => {
    const s = await storage.getExportShipment(req.params.id);
    if (!s) return res.status(404).json({ message: "Shipment not found" });
    res.json(s);
  });
  app.post("/api/export/shipments", async (req, res) => {
    const parsed = insertExportShipmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid shipment", errors: parsed.error.flatten() });
    res.status(201).json(await storage.createExportShipment(parsed.data));
  });
  app.patch("/api/export/shipments/:id", async (req, res) => {
    const parsed = insertExportShipmentSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid shipment update", errors: parsed.error.flatten() });
    const u = await storage.updateExportShipment(req.params.id, parsed.data);
    if (!u) return res.status(404).json({ message: "Shipment not found" });
    res.json(u);
  });
  app.delete("/api/export/shipments/:id", async (req, res) => {
    const existing = await storage.getExportShipment(req.params.id);
    if (!existing) return res.status(404).json({ message: "Shipment not found" });
    await storage.deleteExportShipment(req.params.id);
    res.status(204).end();
  });

  // === FINANCE — Expenses ===
  app.get("/api/finance/expenses", async (_req, res) => res.json(await storage.getExpenses()));
  app.post("/api/finance/expenses", async (req, res) => {
    const parsed = insertExpenseSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid expense", errors: parsed.error.flatten() });
    res.status(201).json(await storage.createExpense(parsed.data));
  });
  app.patch("/api/finance/expenses/:id", async (req, res) => {
    const parsed = insertExpenseSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid update", errors: parsed.error.flatten() });
    const u = await storage.updateExpense(req.params.id, parsed.data);
    if (!u) return res.status(404).json({ message: "Expense not found" });
    res.json(u);
  });
  app.delete("/api/finance/expenses/:id", async (req, res) => {
    const ok = await storage.deleteExpense(req.params.id);
    if (!ok) return res.status(404).json({ message: "Expense not found" });
    res.status(204).end();
  });

  // === FINANCE — Petty Cash Accounts ===
  app.get("/api/finance/petty-cash/accounts", async (_req, res) => res.json(await storage.getPettyCashAccounts()));
  app.post("/api/finance/petty-cash/accounts", async (req, res) => {
    const parsed = insertPettyCashAccountSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid account", errors: parsed.error.flatten() });
    res.status(201).json(await storage.createPettyCashAccount(parsed.data));
  });
  app.patch("/api/finance/petty-cash/accounts/:id", async (req, res) => {
    const parsed = insertPettyCashAccountSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid update", errors: parsed.error.flatten() });
    const u = await storage.updatePettyCashAccount(req.params.id, parsed.data);
    if (!u) return res.status(404).json({ message: "Account not found" });
    res.json(u);
  });
  app.delete("/api/finance/petty-cash/accounts/:id", async (req, res) => {
    const ok = await storage.deletePettyCashAccount(req.params.id);
    if (!ok) return res.status(404).json({ message: "Account not found" });
    res.status(204).end();
  });

  // === FINANCE — Petty Cash Transactions ===
  app.get("/api/finance/petty-cash/transactions", async (req, res) => {
    const accountId = typeof req.query.accountId === "string" ? req.query.accountId : undefined;
    res.json(await storage.getPettyCashTransactions(accountId));
  });
  app.post("/api/finance/petty-cash/transactions", async (req, res) => {
    const parsed = insertPettyCashTransactionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid transaction", errors: parsed.error.flatten() });
    try {
      res.status(201).json(await storage.createPettyCashTransaction(parsed.data));
    } catch (e) { res.status(400).json({ message: (e as Error).message }); }
  });

  // === FINANCE — Supplier Payments (A/P) ===
  app.get("/api/finance/payables", async (_req, res) => res.json(await storage.getSupplierPayments()));
  app.post("/api/finance/payables", async (req, res) => {
    const parsed = insertSupplierPaymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payable", errors: parsed.error.flatten() });
    res.status(201).json(await storage.createSupplierPayment(parsed.data));
  });
  app.patch("/api/finance/payables/:id", async (req, res) => {
    const parsed = updateSupplierPaymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid update", errors: parsed.error.flatten() });
    const current = (await storage.getSupplierPayments()).find(p => p.id === req.params.id);
    if (!current) return res.status(404).json({ message: "Payable not found" });
    const merged = { ...current, ...parsed.data };
    if (Number(merged.paidAmountEtb ?? 0) > Number(merged.totalAmountEtb)) {
      return res.status(400).json({ message: "Invalid update", errors: { fieldErrors: { paidAmountEtb: ["Paid amount cannot exceed total amount"] } } });
    }
    const u = await storage.updateSupplierPayment(req.params.id, parsed.data);
    if (!u) return res.status(404).json({ message: "Payable not found" });
    res.json(u);
  });
  app.delete("/api/finance/payables/:id", async (req, res) => {
    const ok = await storage.deleteSupplierPayment(req.params.id);
    if (!ok) return res.status(404).json({ message: "Payable not found" });
    res.status(204).end();
  });

  // === FINANCE — Customer Payments (A/R) ===
  app.get("/api/finance/receivables", async (_req, res) => res.json(await storage.getCustomerPayments()));
  app.post("/api/finance/receivables", async (req, res) => {
    const parsed = insertCustomerPaymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid receivable", errors: parsed.error.flatten() });
    res.status(201).json(await storage.createCustomerPayment(parsed.data));
  });
  app.patch("/api/finance/receivables/:id", async (req, res) => {
    const parsed = updateCustomerPaymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid update", errors: parsed.error.flatten() });
    const current = (await storage.getCustomerPayments()).find(p => p.id === req.params.id);
    if (!current) return res.status(404).json({ message: "Receivable not found" });
    const merged = { ...current, ...parsed.data };
    if (Number(merged.receivedAmountEtb ?? 0) > Number(merged.totalAmountEtb)) {
      return res.status(400).json({ message: "Invalid update", errors: { fieldErrors: { receivedAmountEtb: ["Received amount cannot exceed total amount"] } } });
    }
    const u = await storage.updateCustomerPayment(req.params.id, parsed.data);
    if (!u) return res.status(404).json({ message: "Receivable not found" });
    res.json(u);
  });
  app.delete("/api/finance/receivables/:id", async (req, res) => {
    const ok = await storage.deleteCustomerPayment(req.params.id);
    if (!ok) return res.status(404).json({ message: "Receivable not found" });
    res.status(204).end();
  });

  // AI
  app.post("/api/ai/chat", async (req, res) => {
    const parsed = z.object({ message: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Message required" });
    try {
      const response = await generateAIResponse(parsed.data.message);
      res.json({ response });
    } catch (e) {
      console.error("AI error:", e);
      res.status(500).json({ message: "AI unavailable" });
    }
  });

  // Executive Reports
  const reportPeriodSchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    periodLabel: z.string().min(1),
    mode: z.enum(["detailed", "precise"]).optional(),
    language: z.enum(["en", "am"]).optional(),
  });
  app.post("/api/reports/generate", async (req, res) => {
    const parsed = reportPeriodSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid period format" });
    const { from, to, periodLabel, mode } = parsed.data;
    const fromDate = new Date(from + "T00:00:00Z");
    const toDate = new Date(to + "T00:00:00Z");
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ message: "Invalid calendar date" });
    }
    if (fromDate.getTime() > toDate.getTime()) {
      return res.status(400).json({ message: "'From' date must be on or before 'To' date" });
    }
    try {
      const report = await buildReport(from, to, periodLabel, mode ?? "precise");
      report.language = "en";
      res.json(report);
    } catch (e) {
      console.error("Report error:", e);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });
  app.get("/api/reports", async (_req, res) => res.json(await storage.getReports()));
  app.get("/api/reports/:id", async (req, res) => {
    const r = await storage.getReport(req.params.id);
    if (!r) return res.status(404).json({ message: "Report not found" });
    res.json(r);
  });
  app.post("/api/reports", async (req, res) => {
    const parsed = z.object({
      title: z.string().min(1),
      periodLabel: z.string().min(1),
      fromDate: z.string().min(1),
      toDate: z.string().min(1),
      content: z.string().min(1),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid report" });
    const created = await storage.createReport(parsed.data);
    res.status(201).json(created);
  });
  app.delete("/api/reports/:id", async (req, res) => {
    const ok = await storage.deleteReport(req.params.id);
    if (!ok) return res.status(404).json({ message: "Report not found" });
    res.status(204).end();
  });

  // ================================================================
  // Telegram AI Sales Bot / Lead CRM
  // ================================================================
  const leadUpdateSchema = z.object({
    status: z.string(),
    notes: z.string(),
    contactName: z.string(),
    contactTitle: z.string(),
    phone: z.string(),
    email: z.string(),
    website: z.string(),
    location: z.string(),
    segment: z.string(),
  }).partial();

  // --- Bot status & webhook setup ---
  app.get("/api/sales-bot/status", async (_req, res) => {
    const configured = isTelegramConfigured();
    let bot: { username?: string; first_name?: string } | null = null;
    if (configured) {
      try { const info = await getBotInfo(); bot = { username: info.username, first_name: info.first_name }; }
      catch { bot = null; }
    }
    res.json({ telegramConfigured: configured, bot });
  });

  app.post("/api/sales-bot/setup-webhook", async (req, res) => {
    if (!isTelegramConfigured()) {
      return res.status(400).json({ message: "TELEGRAM_BOT_TOKEN is not configured. Add it in Secrets first." });
    }
    try {
      const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
      const url = (req.body?.url as string) || `https://${host}/api/telegram/webhook`;
      await setTelegramWebhook(url);
      res.json({ message: "Webhook configured", url });
    } catch (e) {
      res.status(502).json({ message: (e as Error).message });
    }
  });

  // --- Config ---
  app.get("/api/sales-bot/config", async (_req, res) => {
    res.json(await storage.getSalesBotConfig());
  });
  app.patch("/api/sales-bot/config", async (req, res) => {
    const parsed = updateSalesBotConfigSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid config", errors: parsed.error.flatten() });
    res.json(await storage.updateSalesBotConfig(parsed.data));
  });

  // --- Leads ---
  app.get("/api/sales-bot/leads", async (_req, res) => {
    res.json(await storage.getSalesLeads());
  });
  app.post("/api/sales-bot/leads", async (req, res) => {
    const parsed = insertSalesLeadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid lead", errors: parsed.error.flatten() });
    res.status(201).json(await storage.createSalesLead(parsed.data));
  });
  app.patch("/api/sales-bot/leads/:id", async (req, res) => {
    const parsed = leadUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid update", errors: parsed.error.flatten() });
    const updated = await storage.updateSalesLead(req.params.id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Lead not found" });
    res.json(updated);
  });
  app.delete("/api/sales-bot/leads/:id", async (req, res) => {
    const ok = await storage.deleteSalesLead(req.params.id);
    if (!ok) return res.status(404).json({ message: "Lead not found" });
    res.status(204).end();
  });

  app.post("/api/sales-bot/leads/:id/approve", async (req, res) => {
    const lead = await storage.getSalesLead(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    const updated = await storage.updateSalesLead(lead.id, { status: "approved" });
    // If this lead has already connected on Telegram, send an AI opener now.
    if (lead.telegramChatId && isTelegramConfigured()) {
      try {
        const config = await storage.getSalesBotConfig();
        const history = await storage.getSalesMessages(lead.id);
        const opener = await generateSalesReply(config, lead, history, "[The CEO just approved this lead for outreach. Send a warm, professional opening message introducing yourself and the company.]");
        await sendTelegramMessage(lead.telegramChatId, opener);
        await storage.createSalesMessage({ leadId: lead.id, direction: "outbound", channel: "telegram", body: opener });
        await storage.updateSalesLead(lead.id, { status: "contacted" });
      } catch (e) {
        console.error("[sales-bot] approve opener failed:", (e as Error).message);
      }
    }
    res.json(await storage.getSalesLead(lead.id) ?? updated);
  });

  app.post("/api/sales-bot/leads/:id/reject", async (req, res) => {
    const updated = await storage.updateSalesLead(req.params.id, { status: "rejected" });
    if (!updated) return res.status(404).json({ message: "Lead not found" });
    res.json(updated);
  });

  app.post("/api/sales-bot/leads/:id/qualify", async (req, res) => {
    const lead = await storage.getSalesLead(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    try {
      const config = await storage.getSalesBotConfig();
      const q = await qualifyLead(config, lead);
      const updated = await storage.updateSalesLead(lead.id, {
        aiScore: String(q.score), aiQualification: q.qualification, aiPitch: q.pitch,
      });
      res.json(updated);
    } catch (e) {
      res.status(502).json({ message: (e as Error).message });
    }
  });

  // Manually send a message to a connected lead (CEO can step into the chat).
  app.post("/api/sales-bot/leads/:id/message", async (req, res) => {
    const lead = await storage.getSalesLead(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    if (!body) return res.status(400).json({ message: "Message body required" });
    if (!lead.telegramChatId) return res.status(400).json({ message: "This lead has not connected on Telegram yet, so we cannot message them." });
    if (!isTelegramConfigured()) return res.status(400).json({ message: "TELEGRAM_BOT_TOKEN is not configured." });
    try {
      await sendTelegramMessage(lead.telegramChatId, body);
      const msg = await storage.createSalesMessage({ leadId: lead.id, direction: "outbound", channel: "telegram", body });
      res.status(201).json(msg);
    } catch (e) {
      res.status(502).json({ message: (e as Error).message });
    }
  });

  // --- Import (CSV / pasted list) ---
  app.post("/api/sales-bot/import", async (req, res) => {
    const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
    if (!csv.trim()) return res.status(400).json({ message: "Provide CSV text in the 'csv' field." });
    const parsed = parseCsvLeads(csv);
    if (parsed.length === 0) return res.status(400).json({ message: "No valid leads found. Ensure each row has at least a company name." });
    const created = [];
    for (const p of parsed) created.push(await storage.createSalesLead(p));
    res.status(201).json({ count: created.length, leads: created });
  });

  // --- AI discovery (suggests prospects to verify before outreach) ---
  app.post("/api/sales-bot/discover", async (req, res) => {
    const segment = typeof req.body?.segment === "string" ? req.body.segment : "import_export";
    const region = typeof req.body?.region === "string" && req.body.region.trim() ? req.body.region : "Ethiopia";
    const count = Math.max(1, Math.min(15, Number(req.body?.count) || 6));
    try {
      const config = await storage.getSalesBotConfig();
      const candidates = await discoverLeads(config, segment, region, count);
      const created = [];
      for (const c of candidates) {
        created.push(await storage.createSalesLead({
          companyName: c.companyName,
          segment: c.segment,
          location: c.location,
          source: "ai_discovery",
          notes: c.rationale ? `AI suggestion (verify before outreach): ${c.rationale}` : "AI suggestion — verify before outreach.",
        }));
      }
      res.status(201).json({ count: created.length, leads: created });
    } catch (e) {
      res.status(502).json({ message: (e as Error).message });
    }
  });

  // --- Messages ---
  app.get("/api/sales-bot/messages", async (req, res) => {
    const leadId = typeof req.query.leadId === "string" ? req.query.leadId : undefined;
    res.json(await storage.getSalesMessages(leadId));
  });
  app.get("/api/sales-bot/messages/:leadId", async (req, res) => {
    res.json(await storage.getSalesMessages(req.params.leadId));
  });

  // --- Meetings ---
  app.get("/api/sales-bot/meetings", async (_req, res) => {
    res.json(await storage.getSalesMeetings());
  });
  app.post("/api/sales-bot/meetings", async (req, res) => {
    const parsed = insertSalesMeetingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid meeting", errors: parsed.error.flatten() });
    const meeting = await storage.createSalesMeeting(parsed.data);
    await storage.updateSalesLead(parsed.data.leadId, { status: "meeting_booked" });
    res.status(201).json(meeting);
  });
  app.patch("/api/sales-bot/meetings/:id", async (req, res) => {
    const schema = z.object({ status: z.string(), scheduledAt: z.string(), location: z.string(), notes: z.string(), title: z.string(), mode: z.string() }).partial();
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid update", errors: parsed.error.flatten() });
    const updated = await storage.updateSalesMeeting(req.params.id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Meeting not found" });
    res.json(updated);
  });
  app.delete("/api/sales-bot/meetings/:id", async (req, res) => {
    const ok = await storage.deleteSalesMeeting(req.params.id);
    if (!ok) return res.status(404).json({ message: "Meeting not found" });
    res.status(204).end();
  });

  // --- Telegram webhook (called by Telegram; bypasses session guard) ---
  app.post("/api/telegram/webhook", async (req, res) => {
    // Verify the secret token if one is configured.
    const expected = getWebhookSecret();
    if (expected) {
      const got = req.headers["x-telegram-bot-api-secret-token"];
      if (got !== expected) return res.status(401).end();
    }
    // Always acknowledge quickly so Telegram does not retry.
    res.status(200).json({ ok: true });

    try {
      const update = req.body as TelegramUpdate;
      const message = update?.message;
      const text = message?.text?.trim();
      if (!message || !text) return;
      const chatId = String(message.chat.id);
      const username = message.from?.username ?? message.chat.username;
      const displayName =
        message.chat.title ||
        [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") ||
        message.chat.first_name ||
        (username ? `@${username}` : `Telegram ${chatId}`);

      let lead = await storage.getSalesLeadByChatId(chatId);
      if (!lead) {
        lead = await storage.createSalesLead({
          companyName: displayName,
          segment: "other",
          source: "telegram_inbound",
          notes: "Inbound contact who messaged the Telegram bot.",
        });
        lead = (await storage.updateSalesLead(lead.id, {
          telegramChatId: chatId,
          telegramUsername: username ?? null,
          status: "in_conversation",
        }))!;
      }

      await storage.createSalesMessage({ leadId: lead.id, direction: "inbound", channel: "telegram", body: text });

      const config = await storage.getSalesBotConfig();
      if (!config.autoReplyEnabled || !isTelegramConfigured()) return;

      const history = await storage.getSalesMessages(lead.id);
      const incoming = text === "/start"
        ? "[The user just started the conversation. Greet them warmly, introduce yourself and the company in 2-3 sentences, and ask one qualifying question.]"
        : text;
      const reply = await generateSalesReply(config, lead, history, incoming);
      await sendTelegramMessage(chatId, reply);
      await storage.createSalesMessage({ leadId: lead.id, direction: "outbound", channel: "telegram", body: reply });
      if (lead.status === "in_conversation" || lead.status === "approved" || lead.status === "contacted") {
        await storage.updateSalesLead(lead.id, { status: "in_conversation" });
      }
    } catch (e) {
      console.error("[telegram] webhook handling failed:", (e as Error).message);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
