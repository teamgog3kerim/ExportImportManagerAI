import { randomUUID } from "crypto";
import type {
  User, InsertUser, LC, InsertLC, Shipment, InsertShipment,
  InventoryItem, InsertInventoryItem, ExchangeRate, Bank, InsertBank,
  Supplier, InsertSupplier, Certification, InsertCertification,
  CompanySettings, NotificationSettings
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // LCs
  getLCs(): Promise<LC[]>;
  getLC(id: string): Promise<LC | undefined>;
  createLC(lc: InsertLC): Promise<LC>;
  updateLC(id: string, lc: Partial<InsertLC>): Promise<LC | undefined>;
  deleteLC(id: string): Promise<boolean>;
  // Shipments
  getShipments(): Promise<Shipment[]>;
  getShipment(id: string): Promise<Shipment | undefined>;
  createShipment(s: InsertShipment): Promise<Shipment>;
  updateShipment(id: string, s: Partial<InsertShipment>): Promise<Shipment | undefined>;
  deleteShipment(id: string): Promise<boolean>;
  // Inventory
  getInventory(): Promise<InventoryItem[]>;
  getInventoryItem(id: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: string, item: Partial<InsertInventoryItem>): Promise<InventoryItem | undefined>;
  deleteInventoryItem(id: string): Promise<boolean>;
  // Exchange Rates
  getExchangeRates(): Promise<ExchangeRate[]>;
  // Banks
  getBanks(): Promise<Bank[]>;
  createBank(bank: InsertBank): Promise<Bank>;
  deleteBank(id: string): Promise<boolean>;
  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  createSupplier(s: InsertSupplier): Promise<Supplier>;
  deleteSupplier(id: string): Promise<boolean>;
  // Certifications
  getCertifications(): Promise<Certification[]>;
  createCertification(c: InsertCertification): Promise<Certification>;
  deleteCertification(id: string): Promise<boolean>;
  // Settings
  getCompanySettings(): Promise<CompanySettings | undefined>;
  upsertCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings>;
  getNotificationSettings(): Promise<NotificationSettings | undefined>;
  upsertNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings>;
}

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private lcs = new Map<string, LC>();
  private shipments = new Map<string, Shipment>();
  private inventory = new Map<string, InventoryItem>();
  private exchangeRates = new Map<string, ExchangeRate>();
  private banks = new Map<string, Bank>();
  private suppliers = new Map<string, Supplier>();
  private certifications = new Map<string, Certification>();
  private companySettings: CompanySettings | undefined;
  private notificationSettings: NotificationSettings | undefined;

  constructor() { this.seed(); }

  private seed() {
    const now = new Date().toISOString();

    // Seed LCs
    const lcData: LC[] = [
      { id: randomUUID(), lcNumber: "LC-78921", issuingBank: "Commercial Bank of Ethiopia (CBE)", currency: "USD", fobValueUsd: "400000", freightValueUsd: "50000", issueDate: "2024-04-12", expiryDate: "2024-07-11", proformaInvoiceNo: "PI-2024-001", proformaInvoiceDate: "2024-04-01", supplierName: "Global Heavy Industries", supplierAddress: "Shanghai Tech Park, Bldg 4", descriptionOfGoods: "Industrial Machinery for manufacturing plant", totalQuantity: "15 units", entryCertificateLetter: "ECL-889", entryCertificateDate: "2024-04-10", insurancePaidEtb: "0", certificatePaidEtb: "0", marginOpenedPct: "30", paymentTerm: "CIF", partialShipmentAllowed: "false", transshipmentAllowed: "false", status: "Approved", openingPaidStatus: "paid", settlementPaidStatus: "unpaid", createdAt: now },
      { id: randomUUID(), lcNumber: "LC-78923", issuingBank: "Dashen Bank", currency: "USD", fobValueUsd: "150000", freightValueUsd: "0", issueDate: "2024-10-17", expiryDate: "2025-01-17", proformaInvoiceNo: "PI-2024-999", proformaInvoiceDate: "2024-10-01", supplierName: "Shenzhen Electronics Ltd", supplierAddress: "Shenzhen Industrial Zone", descriptionOfGoods: "Electronic Components", totalQuantity: "500 units", entryCertificateLetter: "ECL-912", entryCertificateDate: "2024-10-15", insurancePaidEtb: "0", certificatePaidEtb: "0", marginOpenedPct: "30", paymentTerm: "FOB", partialShipmentAllowed: "true", transshipmentAllowed: "false", status: "Draft", openingPaidStatus: "unpaid", settlementPaidStatus: "unpaid", createdAt: now },
    ];
    lcData.forEach(lc => this.lcs.set(lc.id, lc));

    // Seed Shipments
    const shipmentData: Shipment[] = [
      { id: randomUUID(), origin: "Shanghai, China", destination: "Addis Ababa, Ethiopia", status: "Sea Transit", etdDate: "2024-04-15", etaDate: "2024-05-20", billNumber: "BL-101", declarationNumber: "DEC-77281", supplierName: "Global Heavy Industries", supplierAddress: "Shanghai Tech Park", paymentTerm: "CIF", descriptionOfGoods: "Industrial Machinery", totalValueUsd: "450000", lcId: null, transitPayableEtb: "0", inlandPayableEtb: "0", customsToWarehouseEtb: "0", advancedTaxEtb: "0", demurragePayableEtb: "0", documents: '["Bill Of Loading","Commercial Invoice"]', createdAt: now },
      { id: randomUUID(), origin: "Mundra, India", destination: "Modjo, Ethiopia", status: "Djibouti Port arrived", etdDate: "2024-04-20", etaDate: "2024-05-15", billNumber: "BL-149", declarationNumber: "DEC-88152", supplierName: "Pharmaceuticals X-Type", supplierAddress: "Mumbai Industrial", paymentTerm: "FOB", descriptionOfGoods: "Pharmaceuticals X-Type", totalValueUsd: "120000", lcId: null, transitPayableEtb: "0", inlandPayableEtb: "0", customsToWarehouseEtb: "0", advancedTaxEtb: "0", demurragePayableEtb: "0", documents: '["Bill Of Loading","Commercial Invoice","Packaging List"]', createdAt: now },
      { id: randomUUID(), origin: "Milan, Italy", destination: "Addis Ababa, ET", status: "Arrived to our Store - clearance Complete", etdDate: "2024-01-10", etaDate: "2024-03-10", billNumber: "BL-189", declarationNumber: "DEC-95081", supplierName: "Italian Sofa Sets", supplierAddress: "Milan Design District", paymentTerm: "CIF", descriptionOfGoods: "Italian Sofa Sets", totalValueUsd: "85000", lcId: null, transitPayableEtb: "0", inlandPayableEtb: "0", customsToWarehouseEtb: "0", advancedTaxEtb: "0", demurragePayableEtb: "0", documents: '["Bill Of Loading","Commercial Invoice","Certificate Of Origin","Airway Bill"]', createdAt: now },
    ];
    shipmentData.forEach(s => this.shipments.set(s.id, s));

    // Seed Inventory
    const inventoryData: InventoryItem[] = [
      { id: randomUUID(), shipmentRef: "SHP-001", descriptionOfGoods: "Industrial Machinery", quantityUnits: "450", warehouse: "Kality A1", stockStatus: "In Stock", unitSalePriceEtb: "500", bookedFor: "", markedSoldOut: "false", createdAt: now },
      { id: randomUUID(), shipmentRef: "SHP-003", descriptionOfGoods: "Italian Sofa Sets", quantityUnits: "12", warehouse: "Modjo Dry Port", stockStatus: "Low Stock", unitSalePriceEtb: "1200", bookedFor: "Furniture Expo", markedSoldOut: "false", createdAt: now },
    ];
    inventoryData.forEach(i => this.inventory.set(i.id, i));

    // Seed Exchange Rates (Ethiopian banks - Addis Fortune data)
    const rateData: ExchangeRate[] = [
      { id: randomUUID(), bankName: "Amhara Bank", bankCode: "AM", buyingEtb: "129.6892", sellingEtb: "135.4494", currency: "USD", updatedAt: now },
      { id: randomUUID(), bankName: "Berhan Bank", bankCode: "BE", buyingEtb: "129.6875", sellingEtb: "135.4480", currency: "USD", updatedAt: now },
      { id: randomUUID(), bankName: "Hijra Bank", bankCode: "HI", buyingEtb: "129.6790", sellingEtb: "135.4412", currency: "USD", updatedAt: now },
      { id: randomUUID(), bankName: "Hibret Bank", bankCode: "HB", buyingEtb: "129.6741", sellingEtb: "135.4373", currency: "USD", updatedAt: now },
      { id: randomUUID(), bankName: "Dashen Bank", bankCode: "DA", buyingEtb: "129.6690", sellingEtb: "135.4332", currency: "USD", updatedAt: now },
      { id: randomUUID(), bankName: "ZamZam Bank", bankCode: "ZA", buyingEtb: "129.6625", sellingEtb: "135.4280", currency: "USD", updatedAt: now },
      { id: randomUUID(), bankName: "Oromia Bank", bankCode: "OR", buyingEtb: "129.6577", sellingEtb: "135.4242", currency: "USD", updatedAt: now },
      { id: randomUUID(), bankName: "Commercial Bank of Ethiopia (CBE)", bankCode: "CB", buyingEtb: "129.6500", sellingEtb: "135.4100", currency: "USD", updatedAt: now },
    ];
    rateData.forEach(r => this.exchangeRates.set(r.id, r));

    // Seed Banks (Settings)
    const bankData: Bank[] = [
      { id: randomUUID(), bankName: "Commercial Bank of Ethiopia (CBE)", accountNumber: "1000123456789", swiftBic: "CBETETAA", currency: "ETB / USD", createdAt: now },
      { id: randomUUID(), bankName: "Dashen Bank", accountNumber: "5432109876543", swiftBic: "DASHETAA", currency: "ETB / USD", createdAt: now },
      { id: randomUUID(), bankName: "Bank of Abyssinia (BOA)", accountNumber: "9876543210123", swiftBic: "ABYSETAA", currency: "ETB", createdAt: now },
    ];
    bankData.forEach(b => this.banks.set(b.id, b));

    // Seed Suppliers
    const supplierData: Supplier[] = [
      { id: randomUUID(), name: "Global Heavy Industries", address: "Shanghai Tech Park, Bldg 4", country: "China", email: "trade@ghi.com", phone: "+86 21 1234 5678", createdAt: now },
      { id: randomUUID(), name: "Shenzhen Electronics Ltd", address: "Shenzhen Industrial Zone", country: "China", email: "export@sel.cn", phone: "+86 755 8765 4321", createdAt: now },
    ];
    supplierData.forEach(s => this.suppliers.set(s.id, s));

    // Seed Certifications
    const certData: Certification[] = [
      { id: randomUUID(), certType: "Organic Certification (USDA)", issuingBody: "Control Union", category: "Quality", validity: "12 Months", createdAt: now },
      { id: randomUUID(), certType: "Fairtrade Certification", issuingBody: "FLO-CERT", category: "Social", validity: "24 Months", createdAt: now },
      { id: randomUUID(), certType: "Rainforest Alliance", issuingBody: "RA Cert", category: "Environment", validity: "12 Months", createdAt: now },
    ];
    certData.forEach(c => this.certifications.set(c.id, c));

    // Company Settings
    this.companySettings = { id: randomUUID(), companyName: "Midas Global Trade Ltd", tinNumber: "0012345678", vatNumber: "VAT-998877", primaryEmail: "info@midasglobal.com", phoneNumber: "+251 11 661 2345", website: "www.midasglobal.com", registeredAddress: "Bole Road, Mega Building 4th Floor, Addis Ababa, Ethiopia" };

    // Notification Settings
    this.notificationSettings = { id: randomUUID(), shipmentUpdates: "true", lcExpiryAlerts: "true", paymentNotifications: "true", marketRateAlerts: "false" };
  }

  async getUser(id: string) { return this.users.get(id); }
  async getUserByUsername(username: string) { return Array.from(this.users.values()).find(u => u.username === username); }
  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const u: User = { ...user, id };
    this.users.set(id, u);
    return u;
  }

  async getLCs() { return Array.from(this.lcs.values()); }
  async getLC(id: string) { return this.lcs.get(id); }
  async createLC(lc: InsertLC): Promise<LC> {
    const id = randomUUID();
    const n: LC = { ...lc, id, fobValueUsd: lc.fobValueUsd ?? "0", freightValueUsd: lc.freightValueUsd ?? "0", proformaInvoiceNo: lc.proformaInvoiceNo ?? null, proformaInvoiceDate: lc.proformaInvoiceDate ?? null, supplierAddress: lc.supplierAddress ?? null, descriptionOfGoods: lc.descriptionOfGoods ?? null, totalQuantity: lc.totalQuantity ?? null, entryCertificateLetter: lc.entryCertificateLetter ?? null, entryCertificateDate: lc.entryCertificateDate ?? null, insurancePaidEtb: lc.insurancePaidEtb ?? "0", certificatePaidEtb: lc.certificatePaidEtb ?? "0", marginOpenedPct: lc.marginOpenedPct ?? "30", paymentTerm: lc.paymentTerm ?? "FOB", partialShipmentAllowed: lc.partialShipmentAllowed ?? "false", transshipmentAllowed: lc.transshipmentAllowed ?? "false", openingPaidStatus: lc.openingPaidStatus ?? "unpaid", settlementPaidStatus: lc.settlementPaidStatus ?? "unpaid", createdAt: new Date().toISOString() };
    this.lcs.set(id, n);
    return n;
  }
  async updateLC(id: string, updates: Partial<InsertLC>) {
    const e = this.lcs.get(id);
    if (!e) return undefined;
    const u = { ...e, ...updates };
    this.lcs.set(id, u);
    return u;
  }
  async deleteLC(id: string) { return this.lcs.delete(id); }

  async getShipments() { return Array.from(this.shipments.values()); }
  async getShipment(id: string) { return this.shipments.get(id); }
  async createShipment(s: InsertShipment): Promise<Shipment> {
    const id = randomUUID();
    const shipmentId = `SHP-${String(this.shipments.size + 1).padStart(3, "0")}`;
    const n: Shipment = { ...s, id, etdDate: s.etdDate ?? null, etaDate: s.etaDate ?? null, billNumber: s.billNumber ?? null, declarationNumber: s.declarationNumber ?? null, supplierName: s.supplierName ?? null, supplierAddress: s.supplierAddress ?? null, paymentTerm: s.paymentTerm ?? null, descriptionOfGoods: s.descriptionOfGoods ?? null, totalValueUsd: s.totalValueUsd ?? "0", lcId: s.lcId ?? null, transitPayableEtb: s.transitPayableEtb ?? "0", inlandPayableEtb: s.inlandPayableEtb ?? "0", customsToWarehouseEtb: s.customsToWarehouseEtb ?? "0", advancedTaxEtb: s.advancedTaxEtb ?? "0", demurragePayableEtb: s.demurragePayableEtb ?? "0", documents: s.documents ?? "[]", createdAt: new Date().toISOString() };
    this.shipments.set(id, n);
    return n;
  }
  async updateShipment(id: string, updates: Partial<InsertShipment>) {
    const e = this.shipments.get(id);
    if (!e) return undefined;
    const u = { ...e, ...updates };
    this.shipments.set(id, u);
    return u;
  }
  async deleteShipment(id: string) { return this.shipments.delete(id); }

  async getInventory() { return Array.from(this.inventory.values()); }
  async getInventoryItem(id: string) { return this.inventory.get(id); }
  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const id = randomUUID();
    const n: InventoryItem = { ...item, id, shipmentRef: item.shipmentRef ?? null, quantityUnits: item.quantityUnits ?? "0", unitSalePriceEtb: item.unitSalePriceEtb ?? "0", bookedFor: item.bookedFor ?? null, markedSoldOut: item.markedSoldOut ?? "false", createdAt: new Date().toISOString() };
    this.inventory.set(id, n);
    return n;
  }
  async updateInventoryItem(id: string, updates: Partial<InsertInventoryItem>) {
    const e = this.inventory.get(id);
    if (!e) return undefined;
    const u = { ...e, ...updates };
    this.inventory.set(id, u);
    return u;
  }
  async deleteInventoryItem(id: string) { return this.inventory.delete(id); }

  async getExchangeRates() { return Array.from(this.exchangeRates.values()); }

  async getBanks() { return Array.from(this.banks.values()); }
  async createBank(bank: InsertBank): Promise<Bank> {
    const id = randomUUID();
    const n: Bank = { ...bank, id, createdAt: new Date().toISOString() };
    this.banks.set(id, n);
    return n;
  }
  async deleteBank(id: string) { return this.banks.delete(id); }

  async getSuppliers() { return Array.from(this.suppliers.values()); }
  async createSupplier(s: InsertSupplier): Promise<Supplier> {
    const id = randomUUID();
    const n: Supplier = { ...s, id, address: s.address ?? null, country: s.country ?? null, email: s.email ?? null, phone: s.phone ?? null, createdAt: new Date().toISOString() };
    this.suppliers.set(id, n);
    return n;
  }
  async deleteSupplier(id: string) { return this.suppliers.delete(id); }

  async getCertifications() { return Array.from(this.certifications.values()); }
  async createCertification(c: InsertCertification): Promise<Certification> {
    const id = randomUUID();
    const n: Certification = { ...c, id, createdAt: new Date().toISOString() };
    this.certifications.set(id, n);
    return n;
  }
  async deleteCertification(id: string) { return this.certifications.delete(id); }

  async getCompanySettings() { return this.companySettings; }
  async upsertCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    if (!this.companySettings) {
      this.companySettings = { id: randomUUID(), companyName: "", tinNumber: null, vatNumber: null, primaryEmail: null, phoneNumber: null, website: null, registeredAddress: null, ...settings };
    } else {
      this.companySettings = { ...this.companySettings, ...settings };
    }
    return this.companySettings;
  }

  async getNotificationSettings() { return this.notificationSettings; }
  async upsertNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    if (!this.notificationSettings) {
      this.notificationSettings = { id: randomUUID(), shipmentUpdates: "true", lcExpiryAlerts: "true", paymentNotifications: "true", marketRateAlerts: "false", ...settings };
    } else {
      this.notificationSettings = { ...this.notificationSettings, ...settings };
    }
    return this.notificationSettings;
  }
}

export const storage = new MemStorage();
