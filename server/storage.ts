import { randomUUID } from "crypto";
import type { User, InsertUser, Shipment, InsertShipment, LC, InsertLC, BudgetCategory, InsertBudgetCategory, WhatsappConfig } from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Shipments
  getShipments(): Promise<Shipment[]>;
  getShipment(id: string): Promise<Shipment | undefined>;
  createShipment(shipment: InsertShipment): Promise<Shipment>;
  updateShipment(id: string, shipment: Partial<InsertShipment>): Promise<Shipment | undefined>;
  deleteShipment(id: string): Promise<boolean>;

  // Letters of Credit
  getLCs(): Promise<LC[]>;
  getLC(id: string): Promise<LC | undefined>;
  createLC(lc: InsertLC): Promise<LC>;
  updateLC(id: string, lc: Partial<InsertLC>): Promise<LC | undefined>;
  deleteLC(id: string): Promise<boolean>;

  // Budget Categories
  getBudgetCategories(): Promise<BudgetCategory[]>;
  getBudgetCategory(id: string): Promise<BudgetCategory | undefined>;
  createBudgetCategory(cat: InsertBudgetCategory): Promise<BudgetCategory>;
  updateBudgetCategory(id: string, cat: Partial<InsertBudgetCategory>): Promise<BudgetCategory | undefined>;
  deleteBudgetCategory(id: string): Promise<boolean>;

  // WhatsApp
  getWhatsappConfig(): Promise<WhatsappConfig | undefined>;
  upsertWhatsappConfig(config: Partial<WhatsappConfig>): Promise<WhatsappConfig>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private shipments: Map<string, Shipment> = new Map();
  private lcs: Map<string, LC> = new Map();
  private budgetCategories: Map<string, BudgetCategory> = new Map();
  private whatsappConfig: WhatsappConfig | undefined;

  constructor() {
    this.seedData();
  }

  private seedData() {
    const now = new Date().toISOString();

    // Seed shipments
    const shipmentsData: Shipment[] = [
      { id: "SH-2024-001", supplier: "Acme Electronics", origin: "Shanghai", destination: "New York", status: "in-transit", eta: "2024-11-15", value: "$125,000", description: "Consumer electronics Q4 batch", lcId: "LC-2024-045", createdAt: now },
      { id: "SH-2024-002", supplier: "Global Textiles", origin: "Mumbai", destination: "Los Angeles", status: "arrived", eta: "2024-10-28", value: "$89,500", description: "Winter collection fabrics", lcId: "LC-2024-046", createdAt: now },
      { id: "SH-2024-003", supplier: "Euro Parts GmbH", origin: "Hamburg", destination: "Chicago", status: "delayed", eta: "2024-11-20", value: "$156,000", description: "Automotive parts shipment", lcId: "LC-2024-047", createdAt: now },
      { id: "SH-2024-004", supplier: "Pacific Trading", origin: "Singapore", destination: "Seattle", status: "in-transit", eta: "2024-11-10", value: "$98,000", description: "Electronic components", lcId: null, createdAt: now },
      { id: "SH-2024-005", supplier: "Asia Components", origin: "Shenzhen", destination: "San Francisco", status: "cleared", eta: "2024-10-25", value: "$112,000", description: "PCBs and semiconductors", lcId: null, createdAt: now },
      { id: "SH-2024-006", supplier: "Nordic Supplies", origin: "Oslo", destination: "Miami", status: "in-transit", eta: "2024-11-25", value: "$67,000", description: "Industrial machinery parts", lcId: "LC-2024-048", createdAt: now },
    ];
    shipmentsData.forEach((s) => this.shipments.set(s.id, s));

    // Seed LCs
    const lcsData: LC[] = [
      { id: "LC-2024-045", bank: "HSBC", beneficiary: "Acme Electronics", amount: "$125,000", openDate: "2024-10-01", expiry: "2025-01-15", status: "open", currency: "USD", createdAt: now },
      { id: "LC-2024-046", bank: "Standard Chartered", beneficiary: "Global Textiles", amount: "$89,500", openDate: "2024-09-15", expiry: "2024-12-20", status: "issued", currency: "USD", createdAt: now },
      { id: "LC-2024-047", bank: "Citibank", beneficiary: "Euro Parts GmbH", amount: "$156,000", openDate: "2024-10-10", expiry: "2025-02-28", status: "confirmed", currency: "EUR", createdAt: now },
      { id: "LC-2024-048", bank: "Deutsche Bank", beneficiary: "Pacific Trading", amount: "$98,000", openDate: "2024-08-20", expiry: "2024-11-30", status: "open", currency: "USD", createdAt: now },
      { id: "LC-2024-049", bank: "HSBC", beneficiary: "Asia Components", amount: "$112,000", openDate: "2024-07-15", expiry: "2024-10-31", status: "closed", currency: "USD", createdAt: now },
    ];
    lcsData.forEach((lc) => this.lcs.set(lc.id, lc));

    // Seed budget categories
    const budgets: BudgetCategory[] = [
      { id: randomUUID(), name: "Electronics", allocated: "1000000", spent: "820000", createdAt: now },
      { id: randomUUID(), name: "Textiles", allocated: "800000", spent: "560000", createdAt: now },
      { id: randomUUID(), name: "Raw Materials", allocated: "600000", spent: "420000", createdAt: now },
      { id: randomUUID(), name: "Machinery", allocated: "500000", spent: "485000", createdAt: now },
      { id: randomUUID(), name: "Chemicals", allocated: "300000", spent: "310000", createdAt: now },
    ];
    budgets.forEach((b) => this.budgetCategories.set(b.id, b));

    // Seed WhatsApp config
    this.whatsappConfig = {
      id: randomUUID(),
      phoneNumber: "+1234567890",
      isConnected: "true",
      reportTime: "08:00",
      lastSentAt: new Date(Date.now() - 86400000).toISOString(),
    };
  }

  // Users
  async getUser(id: string) { return this.users.get(id); }
  async getUserByUsername(username: string) {
    return Array.from(this.users.values()).find((u) => u.username === username);
  }
  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }

  // Shipments
  async getShipments() { return Array.from(this.shipments.values()); }
  async getShipment(id: string) { return this.shipments.get(id); }
  async createShipment(shipment: InsertShipment): Promise<Shipment> {
    const id = `SH-${new Date().getFullYear()}-${String(this.shipments.size + 1).padStart(3, "0")}`;
    const newShipment: Shipment = { ...shipment, id, description: shipment.description ?? null, lcId: shipment.lcId ?? null, createdAt: new Date().toISOString() };
    this.shipments.set(id, newShipment);
    return newShipment;
  }
  async updateShipment(id: string, updates: Partial<InsertShipment>) {
    const existing = this.shipments.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.shipments.set(id, updated);
    return updated;
  }
  async deleteShipment(id: string) {
    return this.shipments.delete(id);
  }

  // LCs
  async getLCs() { return Array.from(this.lcs.values()); }
  async getLC(id: string) { return this.lcs.get(id); }
  async createLC(lc: InsertLC): Promise<LC> {
    const id = `LC-${new Date().getFullYear()}-${String(this.lcs.size + 50).padStart(3, "0")}`;
    const newLC: LC = { ...lc, id, createdAt: new Date().toISOString() };
    this.lcs.set(id, newLC);
    return newLC;
  }
  async updateLC(id: string, updates: Partial<InsertLC>) {
    const existing = this.lcs.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.lcs.set(id, updated);
    return updated;
  }
  async deleteLC(id: string) {
    return this.lcs.delete(id);
  }

  // Budget Categories
  async getBudgetCategories() { return Array.from(this.budgetCategories.values()); }
  async getBudgetCategory(id: string) { return this.budgetCategories.get(id); }
  async createBudgetCategory(cat: InsertBudgetCategory): Promise<BudgetCategory> {
    const id = randomUUID();
    const newCat: BudgetCategory = { ...cat, id, spent: cat.spent ?? "0", createdAt: new Date().toISOString() };
    this.budgetCategories.set(id, newCat);
    return newCat;
  }
  async updateBudgetCategory(id: string, updates: Partial<InsertBudgetCategory>) {
    const existing = this.budgetCategories.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.budgetCategories.set(id, updated);
    return updated;
  }
  async deleteBudgetCategory(id: string) {
    return this.budgetCategories.delete(id);
  }

  // WhatsApp
  async getWhatsappConfig() { return this.whatsappConfig; }
  async upsertWhatsappConfig(config: Partial<WhatsappConfig>): Promise<WhatsappConfig> {
    if (!this.whatsappConfig) {
      this.whatsappConfig = { id: randomUUID(), phoneNumber: "", isConnected: "false", reportTime: "08:00", lastSentAt: null, ...config };
    } else {
      this.whatsappConfig = { ...this.whatsappConfig, ...config };
    }
    return this.whatsappConfig;
  }
}

export const storage = new MemStorage();
