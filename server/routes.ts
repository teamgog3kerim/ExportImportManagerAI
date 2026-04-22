import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { generateAIResponse, generateDailySummary } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Exchange Rates
  app.get("/api/exchange-rates", async (_req, res) => res.json(await storage.getExchangeRates()));

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
    try {
      const s = await storage.createSupplier(req.body);
      res.status(201).json(s);
    } catch (e) { res.status(400).json({ message: String(e) }); }
  });
  app.delete("/api/settings/suppliers/:id", async (req, res) => {
    await storage.deleteSupplier(req.params.id);
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

  const httpServer = createServer(app);
  return httpServer;
}
