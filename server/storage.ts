import { randomUUID } from "crypto";
import type {
  User, InsertUser, LC, InsertLC, Shipment, InsertShipment,
  InventoryItem, InsertInventoryItem, ExchangeRate, Bank, InsertBank,
  Supplier, InsertSupplier, Certification, InsertCertification,
  CompanySettings, NotificationSettings,
  ExportPurchase, InsertExportPurchase, Cad, InsertCad,
  ExportShipment, InsertExportShipment,
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
  setExchangeRates(rates: ExchangeRate[]): Promise<void>;
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
  // Export Purchases
  getExportPurchases(): Promise<ExportPurchase[]>;
  getExportPurchase(id: string): Promise<ExportPurchase | undefined>;
  createExportPurchase(p: InsertExportPurchase): Promise<ExportPurchase>;
  updateExportPurchase(id: string, p: Partial<InsertExportPurchase>): Promise<ExportPurchase | undefined>;
  deleteExportPurchase(id: string): Promise<boolean>;
  // CADs
  getCads(): Promise<Cad[]>;
  getCad(id: string): Promise<Cad | undefined>;
  createCad(c: InsertCad): Promise<Cad>;
  updateCad(id: string, c: Partial<InsertCad>): Promise<Cad | undefined>;
  deleteCad(id: string): Promise<boolean>;
  // Export Shipments
  getExportShipments(): Promise<ExportShipment[]>;
  getExportShipment(id: string): Promise<ExportShipment | undefined>;
  createExportShipment(s: InsertExportShipment): Promise<ExportShipment>;
  updateExportShipment(id: string, s: Partial<InsertExportShipment>): Promise<ExportShipment | undefined>;
  deleteExportShipment(id: string): Promise<boolean>;
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
  private exportPurchases = new Map<string, ExportPurchase>();
  private cads = new Map<string, Cad>();
  private exportShipments = new Map<string, ExportShipment>();

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

    // Seed Exchange Rates — all major Ethiopian banks (Addis Fortune board)
    // Reflects the post-NBE-liberalization birr market; transaction buy ~156–159, sell ~159–162.
    // [bankName, bankCode, txnBuy, txnSell, cashBuy, cashSell]
    const seedBanks: Array<[string, string, number, number, number, number]> = [
      ["Commercial Bank of Ethiopia", "CBE", 156.8421, 159.9789, 156.5300, 160.2900],
      ["Awash Bank",                   "AWB", 158.4500, 161.6190, 157.9800, 161.9300],
      ["Dashen Bank",                  "DAS", 158.1200, 161.2824, 157.7100, 161.6200],
      ["Bank of Abyssinia",            "BOA", 157.6800, 160.8336, 157.2400, 161.1600],
      ["Wegagen Bank",                 "WEG", 157.4500, 160.5990, 157.0100, 160.9400],
      ["Nib International Bank",       "NIB", 157.2300, 160.3746, 156.7900, 160.7300],
      ["Hibret Bank",                  "HIB", 157.9200, 161.0784, 157.4900, 161.4100],
      ["Cooperative Bank of Oromia",   "CBO", 157.6100, 160.7622, 157.1700, 161.0900],
      ["Lion International Bank",      "LIB", 157.0800, 160.2216, 156.6300, 160.5700],
      ["Zemen Bank",                   "ZEM", 158.0900, 161.2518, 157.6700, 161.5800],
      ["Oromia International Bank",    "OIB", 156.9500, 160.0890, 156.5200, 160.4500],
      ["Berhan Bank",                  "BER", 158.2700, 161.4354, 157.8500, 161.7600],
      ["Bunna Bank",                   "BUN", 156.7800, 159.9156, 156.3500, 160.2700],
      ["Abay Bank",                    "ABA", 157.4900, 160.6398, 157.0500, 160.9700],
      ["Addis International Bank",     "ADD", 156.6100, 159.7422, 156.1700, 160.1100],
      ["Debub Global Bank",            "DGB", 156.4300, 159.5586, 156.0000, 159.9300],
      ["Enat Bank",                    "ENA", 157.3500, 160.4970, 156.9100, 160.8400],
      ["Amhara Bank",                  "AMB", 158.6400, 161.8128, 158.1900, 162.1400],
      ["Hijra Bank",                   "HIJ", 158.0500, 161.2110, 157.6300, 161.5400],
      ["ZamZam Bank",                  "ZAM", 157.7900, 160.9458, 157.3500, 161.2700],
      ["Goh Betoch Bank",              "GOH", 156.5400, 159.6708, 156.1100, 160.0200],
      ["Tsehay Bank",                  "TSE", 156.8900, 160.0278, 156.4600, 160.3700],
      ["Siinqee Bank",                 "SIQ", 157.0200, 160.1604, 156.5800, 160.5000],
      ["Shabelle Bank",                "SHA", 157.1600, 160.3032, 156.7200, 160.6400],
      ["Gadaa Bank",                   "GAD", 156.5800, 159.7116, 156.1500, 160.0500],
      ["Ahadu Bank",                   "AHB", 157.1100, 160.2522, 156.6700, 160.5900],
    ];
    const rateData: ExchangeRate[] = seedBanks.map(([name, code, tb, ts, cb, cs]) => ({
      id: randomUUID(),
      bankName: name,
      bankCode: code,
      buyingEtb: tb.toFixed(4),
      sellingEtb: ts.toFixed(4),
      cashBuyingEtb: cb.toFixed(4),
      cashSellingEtb: cs.toFixed(4),
      currency: "USD",
      updatedAt: now,
    }));
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

    // Seed Export Purchases (sourcing local Ethiopian goods for export)
    const purchaseData: ExportPurchase[] = [
      { id: randomUUID(), purchaseRef: "PUR-EXP-001", supplierName: "Yirgacheffe Coffee Cooperative", supplierLocation: "Yirgacheffe, SNNPR", productName: "Yirgacheffe Coffee Grade 1", productCategory: "Coffee", qualityGrade: "Grade 1", quantityKg: "12000", unitPriceEtb: "385", totalCostEtb: "4620000", warehouse: "Modjo Dry Port", certifications: '["Organic (USDA)","Fairtrade","Rainforest Alliance"]', status: "Ready for Export", paymentStatus: "Paid", purchaseDate: "2024-04-02", notes: "Premium washed Arabica, harvest 2024", createdAt: now },
      { id: randomUUID(), purchaseRef: "PUR-EXP-002", supplierName: "Humera Sesame Union", supplierLocation: "Humera, Tigray", productName: "White Humera Sesame Seeds", productCategory: "Sesame", qualityGrade: "Premium", quantityKg: "25000", unitPriceEtb: "92", totalCostEtb: "2300000", warehouse: "Addis Ababa Central", certifications: '["Organic (USDA)"]', status: "In Storage", paymentStatus: "Paid", purchaseDate: "2024-04-08", notes: "99.5% purity, 50% oil content", createdAt: now },
      { id: randomUUID(), purchaseRef: "PUR-EXP-003", supplierName: "Modjo Tannery PLC", supplierLocation: "Modjo, Oromia", productName: "Wet Blue Sheep Skin", productCategory: "Leather", qualityGrade: "Grade A", quantityKg: "8000", unitPriceEtb: "240", totalCostEtb: "1920000", warehouse: "Modjo Dry Port", certifications: '["Leather Working Group (LWG)"]', status: "Sourced", paymentStatus: "Partial", purchaseDate: "2024-04-12", notes: "Pickled, ready for finishing", createdAt: now },
    ];
    purchaseData.forEach(p => this.exportPurchases.set(p.id, p));

    // Seed CADs (Cash Against Documents)
    const cadData: Cad[] = [
      { id: randomUUID(), cadNumber: "CAD-2024-001", buyerName: "Hamburg Coffee Roasters GmbH", buyerAddress: "Hafenstraße 12, 20359 Hamburg", buyerCountry: "Germany", buyerBank: "Deutsche Bank AG", buyerSwift: "DEUTDEFF", productDescription: "Yirgacheffe Coffee Grade 1 — 12,000 kg", quantityKg: "12000", unitPriceUsd: "5.80", fobValueUsd: "69600", freightUsd: "4200", insuranceUsd: "850", totalContractUsd: "74650", exchangeRate: "157.4900", bankCommissionPct: "1", nbeRetentionPct: "30", paymentTerms: "Sight", documentsRequired: '["Commercial Invoice","Bill of Lading","Certificate of Origin","Phytosanitary Certificate","Quality Certificate (ECX)","Packing List"]', contractDate: "2024-04-15", shipmentDate: "2024-05-01", status: "Documents Sent", paidStatus: "unpaid", createdAt: now },
      { id: randomUUID(), cadNumber: "CAD-2024-002", buyerName: "Jeddah Spice Trading Co.", buyerAddress: "King Abdullah Road, Jeddah 21442", buyerCountry: "Saudi Arabia", buyerBank: "Al Rajhi Bank", buyerSwift: "RJHISARI", productDescription: "White Humera Sesame Seeds — 25,000 kg", quantityKg: "25000", unitPriceUsd: "1.45", fobValueUsd: "36250", freightUsd: "2100", insuranceUsd: "420", totalContractUsd: "38770", exchangeRate: "157.2300", bankCommissionPct: "1", nbeRetentionPct: "30", paymentTerms: "30 Days", documentsRequired: '["Commercial Invoice","Bill of Lading","Certificate of Origin","Phytosanitary Certificate"]', contractDate: "2024-04-20", shipmentDate: "2024-05-15", status: "Awaiting Payment", paidStatus: "unpaid", createdAt: now },
      { id: randomUUID(), cadNumber: "CAD-2024-003", buyerName: "Milano Pelle SRL", buyerAddress: "Via della Moda 45, Milan", buyerCountry: "Italy", buyerBank: "Intesa Sanpaolo", buyerSwift: "BCITITMM", productDescription: "Wet Blue Sheep Skin — 8,000 kg", quantityKg: "8000", unitPriceUsd: "3.20", fobValueUsd: "25600", freightUsd: "1800", insuranceUsd: "350", totalContractUsd: "27750", exchangeRate: "157.9200", bankCommissionPct: "1", nbeRetentionPct: "30", paymentTerms: "Sight", documentsRequired: '["Commercial Invoice","Bill of Lading","Certificate of Origin"]', contractDate: "2024-04-25", shipmentDate: "2024-06-01", status: "Draft", paidStatus: "unpaid", createdAt: now },
    ];
    cadData.forEach(c => this.cads.set(c.id, c));

    // Seed Export Shipments
    const exportShipmentData: ExportShipment[] = [
      { id: randomUUID(), exportRef: "EXP-001", cadId: null, origin: "Modjo Dry Port", port: "Djibouti", destination: "Hamburg Port", destinationCountry: "Germany", buyerName: "Hamburg Coffee Roasters GmbH", status: "Sea Transit", etdDate: "2024-05-01", etaDate: "2024-06-15", vesselName: "MAERSK SEMARANG", containerNumber: "MSKU-7783201", blNumber: "BL-EXP-2024-001", declarationNumber: "EXP-DEC-44521", productDescription: "Yirgacheffe Coffee Grade 1", quantityKg: "12000", fobValueUsd: "69600", freightUsd: "4200", insuranceEtb: "110000", inlandTransportEtb: "85000", customsClearanceEtb: "42000", portHandlingEtb: "65000", documents: '["Commercial Invoice","Bill of Lading","Certificate of Origin","Phytosanitary Certificate","ECX Quality Certificate"]', certifications: '["Organic (USDA)","Fairtrade"]', createdAt: now },
      { id: randomUUID(), exportRef: "EXP-002", cadId: null, origin: "Addis Ababa Central", port: "Djibouti", destination: "Jeddah Islamic Port", destinationCountry: "Saudi Arabia", buyerName: "Jeddah Spice Trading Co.", status: "At Djibouti Port", etdDate: "2024-05-15", etaDate: "2024-06-02", vesselName: "CMA CGM JEDDAH", containerNumber: "TGHU-4421890", blNumber: "BL-EXP-2024-002", declarationNumber: "EXP-DEC-44598", productDescription: "White Humera Sesame Seeds", quantityKg: "25000", fobValueUsd: "36250", freightUsd: "2100", insuranceEtb: "55000", inlandTransportEtb: "120000", customsClearanceEtb: "38000", portHandlingEtb: "52000", documents: '["Commercial Invoice","Bill of Lading","Certificate of Origin"]', certifications: '["Organic (USDA)"]', createdAt: now },
      { id: randomUUID(), exportRef: "EXP-003", cadId: null, origin: "Modjo Dry Port", port: "Djibouti", destination: "Genoa Port", destinationCountry: "Italy", buyerName: "Milano Pelle SRL", status: "Preparing", etdDate: "2024-06-01", etaDate: "2024-07-08", vesselName: "", containerNumber: "", blNumber: "", declarationNumber: "EXP-DEC-44612", productDescription: "Wet Blue Sheep Skin", quantityKg: "8000", fobValueUsd: "25600", freightUsd: "1800", insuranceEtb: "45000", inlandTransportEtb: "62000", customsClearanceEtb: "28000", portHandlingEtb: "38000", documents: '["Commercial Invoice"]', certifications: '["Leather Working Group (LWG)"]', createdAt: now },
    ];
    exportShipmentData.forEach(s => this.exportShipments.set(s.id, s));
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
  async setExchangeRates(rates: ExchangeRate[]) {
    this.exchangeRates.clear();
    for (const r of rates) this.exchangeRates.set(r.id, r);
  }

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

  // === Export Purchases ===
  async getExportPurchases() { return Array.from(this.exportPurchases.values()); }
  async getExportPurchase(id: string) { return this.exportPurchases.get(id); }
  async createExportPurchase(p: InsertExportPurchase): Promise<ExportPurchase> {
    const id = randomUUID();
    const ref = p.purchaseRef || `PUR-EXP-${String(this.exportPurchases.size + 1).padStart(3, "0")}`;
    const n: ExportPurchase = {
      ...p, id, purchaseRef: ref,
      supplierLocation: p.supplierLocation ?? null,
      productCategory: p.productCategory ?? null,
      qualityGrade: p.qualityGrade ?? null,
      quantityKg: p.quantityKg ?? "0",
      unitPriceEtb: p.unitPriceEtb ?? "0",
      totalCostEtb: p.totalCostEtb ?? "0",
      warehouse: p.warehouse ?? null,
      certifications: p.certifications ?? "[]",
      status: p.status ?? "Sourced",
      paymentStatus: p.paymentStatus ?? "Unpaid",
      purchaseDate: p.purchaseDate ?? null,
      notes: p.notes ?? null,
      createdAt: new Date().toISOString(),
    };
    this.exportPurchases.set(id, n);
    return n;
  }
  async updateExportPurchase(id: string, updates: Partial<InsertExportPurchase>) {
    const e = this.exportPurchases.get(id); if (!e) return undefined;
    const u = { ...e, ...updates }; this.exportPurchases.set(id, u); return u;
  }
  async deleteExportPurchase(id: string) { return this.exportPurchases.delete(id); }

  // === CADs ===
  async getCads() { return Array.from(this.cads.values()); }
  async getCad(id: string) { return this.cads.get(id); }
  async createCad(c: InsertCad): Promise<Cad> {
    const id = randomUUID();
    const num = c.cadNumber || `CAD-${new Date().getFullYear()}-${String(this.cads.size + 1).padStart(3, "0")}`;
    const n: Cad = {
      ...c, id, cadNumber: num,
      buyerAddress: c.buyerAddress ?? null,
      buyerCountry: c.buyerCountry ?? null,
      buyerBank: c.buyerBank ?? null,
      buyerSwift: c.buyerSwift ?? null,
      productDescription: c.productDescription ?? null,
      quantityKg: c.quantityKg ?? "0",
      unitPriceUsd: c.unitPriceUsd ?? "0",
      fobValueUsd: c.fobValueUsd ?? "0",
      freightUsd: c.freightUsd ?? "0",
      insuranceUsd: c.insuranceUsd ?? "0",
      totalContractUsd: c.totalContractUsd ?? "0",
      exchangeRate: c.exchangeRate ?? "157.50",
      bankCommissionPct: c.bankCommissionPct ?? "1",
      nbeRetentionPct: c.nbeRetentionPct ?? "30",
      paymentTerms: c.paymentTerms ?? "Sight",
      documentsRequired: c.documentsRequired ?? "[]",
      contractDate: c.contractDate ?? null,
      shipmentDate: c.shipmentDate ?? null,
      status: c.status ?? "Draft",
      paidStatus: c.paidStatus ?? "unpaid",
      createdAt: new Date().toISOString(),
    };
    this.cads.set(id, n);
    return n;
  }
  async updateCad(id: string, updates: Partial<InsertCad>) {
    const e = this.cads.get(id); if (!e) return undefined;
    const u = { ...e, ...updates }; this.cads.set(id, u); return u;
  }
  async deleteCad(id: string) { return this.cads.delete(id); }

  // === Export Shipments ===
  async getExportShipments() { return Array.from(this.exportShipments.values()); }
  async getExportShipment(id: string) { return this.exportShipments.get(id); }
  async createExportShipment(s: InsertExportShipment): Promise<ExportShipment> {
    const id = randomUUID();
    const ref = s.exportRef || `EXP-${String(this.exportShipments.size + 1).padStart(3, "0")}`;
    const n: ExportShipment = {
      ...s, id, exportRef: ref,
      cadId: s.cadId ?? null,
      port: s.port ?? "Djibouti",
      destinationCountry: s.destinationCountry ?? null,
      buyerName: s.buyerName ?? null,
      status: s.status ?? "Preparing",
      etdDate: s.etdDate ?? null,
      etaDate: s.etaDate ?? null,
      vesselName: s.vesselName ?? null,
      containerNumber: s.containerNumber ?? null,
      blNumber: s.blNumber ?? null,
      declarationNumber: s.declarationNumber ?? null,
      productDescription: s.productDescription ?? null,
      quantityKg: s.quantityKg ?? "0",
      fobValueUsd: s.fobValueUsd ?? "0",
      freightUsd: s.freightUsd ?? "0",
      insuranceEtb: s.insuranceEtb ?? "0",
      inlandTransportEtb: s.inlandTransportEtb ?? "0",
      customsClearanceEtb: s.customsClearanceEtb ?? "0",
      portHandlingEtb: s.portHandlingEtb ?? "0",
      documents: s.documents ?? "[]",
      certifications: s.certifications ?? "[]",
      createdAt: new Date().toISOString(),
    };
    this.exportShipments.set(id, n);
    return n;
  }
  async updateExportShipment(id: string, updates: Partial<InsertExportShipment>) {
    const e = this.exportShipments.get(id); if (!e) return undefined;
    const u = { ...e, ...updates }; this.exportShipments.set(id, u); return u;
  }
  async deleteExportShipment(id: string) { return this.exportShipments.delete(id); }
}

export const storage = new MemStorage();
