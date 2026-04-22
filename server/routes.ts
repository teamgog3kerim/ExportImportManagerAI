import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertShipmentSchema, insertLcSchema, insertBudgetCategorySchema } from "@shared/schema";
import { generateAIResponse, generateDailySummary } from "./openai";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Shipments
  app.get("/api/shipments", async (_req, res) => {
    const shipments = await storage.getShipments();
    res.json(shipments);
  });

  app.get("/api/shipments/:id", async (req, res) => {
    const shipment = await storage.getShipment(req.params.id);
    if (!shipment) return res.status(404).json({ message: "Shipment not found" });
    res.json(shipment);
  });

  app.post("/api/shipments", async (req, res) => {
    const parsed = insertShipmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const shipment = await storage.createShipment(parsed.data);
    res.status(201).json(shipment);
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

  // Letters of Credit
  app.get("/api/lcs", async (_req, res) => {
    const lcs = await storage.getLCs();
    res.json(lcs);
  });

  app.get("/api/lcs/:id", async (req, res) => {
    const lc = await storage.getLC(req.params.id);
    if (!lc) return res.status(404).json({ message: "LC not found" });
    res.json(lc);
  });

  app.post("/api/lcs", async (req, res) => {
    const parsed = insertLcSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const lc = await storage.createLC(parsed.data);
    res.status(201).json(lc);
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

  // Budget Categories
  app.get("/api/budgets", async (_req, res) => {
    const categories = await storage.getBudgetCategories();
    res.json(categories);
  });

  app.post("/api/budgets", async (req, res) => {
    const parsed = insertBudgetCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const category = await storage.createBudgetCategory(parsed.data);
    res.status(201).json(category);
  });

  app.patch("/api/budgets/:id", async (req, res) => {
    const updated = await storage.updateBudgetCategory(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Budget category not found" });
    res.json(updated);
  });

  app.delete("/api/budgets/:id", async (req, res) => {
    const deleted = await storage.deleteBudgetCategory(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Budget category not found" });
    res.status(204).end();
  });

  // Dashboard summary
  app.get("/api/dashboard", async (_req, res) => {
    const [shipments, lcs, budgets] = await Promise.all([
      storage.getShipments(),
      storage.getLCs(),
      storage.getBudgetCategories(),
    ]);

    const inTransit = shipments.filter(s => s.status === "in-transit").length;
    const delayed = shipments.filter(s => s.status === "delayed").length;
    const pendingClearance = shipments.filter(s => s.status === "arrived").length;
    const activeLCs = lcs.filter(lc => lc.status !== "closed").length;
    const totalAllocated = budgets.reduce((sum, b) => sum + Number(b.allocated), 0);
    const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spent), 0);

    res.json({
      activeShipments: shipments.length,
      inTransit,
      delayed,
      pendingClearance,
      openLCs: activeLCs,
      totalBudget: totalAllocated,
      totalSpent,
      recentShipments: shipments.slice(0, 5),
      activeLCList: lcs.filter(lc => lc.status !== "closed").slice(0, 3),
      budgetCategories: budgets,
    });
  });

  // AI Assistant
  app.post("/api/ai/chat", async (req, res) => {
    const schema = z.object({ message: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Message is required" });

    try {
      const response = await generateAIResponse(parsed.data.message);
      res.json({ response });
    } catch (error) {
      console.error("AI error:", error);
      res.status(500).json({ message: "Failed to get AI response" });
    }
  });

  // WhatsApp daily summary
  app.get("/api/whatsapp/summary", async (_req, res) => {
    try {
      const summary = await generateDailySummary();
      const config = await storage.getWhatsappConfig();
      res.json({ summary, config });
    } catch (error) {
      console.error("Summary error:", error);
      res.status(500).json({ message: "Failed to generate summary" });
    }
  });

  app.get("/api/whatsapp/config", async (_req, res) => {
    const config = await storage.getWhatsappConfig();
    res.json(config || null);
  });

  app.patch("/api/whatsapp/config", async (req, res) => {
    const config = await storage.upsertWhatsappConfig(req.body);
    res.json(config);
  });

  const httpServer = createServer(app);
  return httpServer;
}
