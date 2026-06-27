import { pgTable, text, varchar, numeric, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { PermLevel } from "./permissions";

// Users
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("staff"),
  status: text("status").notNull().default("pending"),
  permissions: jsonb("permissions").$type<Record<string, PermLevel>>().notNull().default({}),
  createdAt: text("created_at").notNull(),
});

// Application-wide settings (key/value). Holds runtime toggles such as whether
// public self sign-up is enabled. Persisted in Postgres so the choice survives
// restarts. See migrations/0002_app_settings.sql.
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Demo requests submitted by prospective clients from the public sign-up page
// when self sign-up is disabled. Persisted so an admin can review the leads and
// follow up. See migrations/0003_demo_requests.sql.
export const demoRequests = pgTable("demo_requests", {
  id: varchar("id").primaryKey(),
  fullName: text("full_name").notNull(),
  companyName: text("company_name").notNull(),
  companyCategory: text("company_category").notNull(),
  categoryOther: text("category_other"),
  position: text("position").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull(),
});

// Letters of Credit (Import)
export const lcs = pgTable("lcs", {
  id: varchar("id").primaryKey(),
  lcNumber: text("lc_number").notNull(),
  issuingBank: text("issuing_bank").notNull(),
  currency: text("currency").notNull().default("USD"),
  fobValueUsd: numeric("fob_value_usd").notNull().default("0"),
  freightValueUsd: numeric("freight_value_usd").notNull().default("0"),
  issueDate: text("issue_date").notNull(),
  expiryDate: text("expiry_date").notNull(),
  proformaInvoiceNo: text("proforma_invoice_no"),
  proformaInvoiceDate: text("proforma_invoice_date"),
  supplierName: text("supplier_name").notNull(),
  supplierAddress: text("supplier_address"),
  descriptionOfGoods: text("description_of_goods"),
  totalQuantity: text("total_quantity"),
  entryCertificateLetter: text("entry_certificate_letter"),
  entryCertificateDate: text("entry_certificate_date"),
  insuranceReferenceNo: text("insurance_reference_no"),
  insurancePaidEtb: numeric("insurance_paid_etb").default("0"),
  certificatePaidEtb: numeric("certificate_paid_etb").default("0"),
  marginOpenedPct: numeric("margin_opened_pct").default("30"),
  paymentTerm: text("payment_term").default("FOB"),
  partialShipmentAllowed: text("partial_shipment_allowed").default("false"),
  partialShipmentUnits: text("partial_shipment_units"),
  transshipmentAllowed: text("transshipment_allowed").default("false"),
  status: text("status").notNull().default("Draft"),
  openingPaidStatus: text("opening_paid_status").default("unpaid"),
  settlementPaidStatus: text("settlement_paid_status").default("unpaid"),
  createdAt: text("created_at").notNull(),
});

// Shipments
export const shipments = pgTable("shipments", {
  id: varchar("id").primaryKey(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  status: text("status").notNull().default("Under Production"),
  etdDate: text("etd_date"),
  etaDate: text("eta_date"),
  billNumber: text("bill_number"),
  declarationNumber: text("declaration_number"),
  supplierName: text("supplier_name"),
  supplierAddress: text("supplier_address"),
  paymentTerm: text("payment_term"),
  descriptionOfGoods: text("description_of_goods"),
  totalValueUsd: numeric("total_value_usd").default("0"),
  lcId: varchar("lc_id"),
  transitPayableEtb: numeric("transit_payable_etb").default("0"),
  inlandPayableEtb: numeric("inland_payable_etb").default("0"),
  customsToWarehouseEtb: numeric("customs_to_warehouse_etb").default("0"),
  advancedTaxEtb: numeric("advanced_tax_etb").default("0"),
  demurragePayableEtb: numeric("demurrage_payable_etb").default("0"),
  documents: text("documents").default("[]"),
  createdAt: text("created_at").notNull(),
});

// Inventory
export const inventory = pgTable("inventory", {
  id: varchar("id").primaryKey(),
  shipmentRef: varchar("shipment_ref"),
  descriptionOfGoods: text("description_of_goods").notNull(),
  quantityUnits: numeric("quantity_units").default("0"),
  warehouse: text("warehouse").notNull(),
  stockStatus: text("stock_status").default("In Stock"),
  unitSalePriceEtb: numeric("unit_sale_price_etb").default("0"),
  bookedFor: text("booked_for"),
  markedSoldOut: text("marked_sold_out").default("false"),
  serialNumbers: text("serial_numbers").array(),
  soldSerials: text("sold_serials").array(),
  createdAt: text("created_at").notNull(),
});

// Sales (Import — selling cleared inventory by serial number)
export const sales = pgTable("sales", {
  id: varchar("id").primaryKey(),
  saleRef: text("sale_ref").notNull(),
  customerName: text("customer_name").notNull(),
  customerContact: text("customer_contact"),
  customerTin: text("customer_tin"),
  saleDate: text("sale_date").notNull(),
  paymentMethod: text("payment_method").default("Cash"),
  paymentStatus: text("payment_status").default("Unpaid"),
  status: text("status").default("Completed"),
  items: text("items").notNull().default("[]"),
  subtotalEtb: numeric("subtotal_etb").notNull().default("0"),
  discountEtb: numeric("discount_etb").default("0"),
  vatEtb: numeric("vat_etb").default("0"),
  totalEtb: numeric("total_etb").notNull().default("0"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

// Exchange Rates
export const exchangeRates = pgTable("exchange_rates", {
  id: varchar("id").primaryKey(),
  bankName: text("bank_name").notNull(),
  bankCode: text("bank_code").notNull(),
  buyingEtb: numeric("buying_etb").notNull(),
  sellingEtb: numeric("selling_etb").notNull(),
  cashBuyingEtb: numeric("cash_buying_etb").notNull().default("0"),
  cashSellingEtb: numeric("cash_selling_etb").notNull().default("0"),
  currency: text("currency").default("USD"),
  updatedAt: text("updated_at").notNull(),
});

// Banks (Settings)
export const banks = pgTable("banks", {
  id: varchar("id").primaryKey(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  swiftBic: text("swift_bic").notNull(),
  currency: text("currency").notNull(),
  createdAt: text("created_at").notNull(),
});

// Suppliers (Settings)
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  country: text("country"),
  email: text("email"),
  phone: text("phone"),
  products: text("products").array(),
  createdAt: text("created_at").notNull(),
});

// Buyers (Settings — foreign buyers for export)
export const buyers = pgTable("buyers", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  products: text("products").array(),
  createdAt: text("created_at").notNull(),
});

// Certifications (Settings)
export const certifications = pgTable("certifications", {
  id: varchar("id").primaryKey(),
  certType: text("cert_type").notNull(),
  issuingBody: text("issuing_body").notNull(),
  category: text("category").notNull(),
  validity: text("validity").notNull(),
  createdAt: text("created_at").notNull(),
});

// Company Settings
export const companySettings = pgTable("company_settings", {
  id: varchar("id").primaryKey(),
  companyName: text("company_name").notNull(),
  tinNumber: text("tin_number"),
  vatNumber: text("vat_number"),
  primaryEmail: text("primary_email"),
  phoneNumber: text("phone_number"),
  website: text("website"),
  registeredAddress: text("registered_address"),
});

// Notification Settings
export const notificationSettings = pgTable("notification_settings", {
  id: varchar("id").primaryKey(),
  shipmentUpdates: text("shipment_updates").default("true"),
  lcExpiryAlerts: text("lc_expiry_alerts").default("true"),
  paymentNotifications: text("payment_notifications").default("true"),
  marketRateAlerts: text("market_rate_alerts").default("false"),
});

// === EXPORT MODULE ===

// Export Purchases (sourcing inventory for export from local Ethiopian suppliers)
export const exportPurchases = pgTable("export_purchases", {
  id: varchar("id").primaryKey(),
  purchaseRef: text("purchase_ref").notNull(),
  supplierName: text("supplier_name").notNull(),
  supplierLocation: text("supplier_location"),
  productName: text("product_name").notNull(),
  productCategory: text("product_category"),
  qualityGrade: text("quality_grade"),
  quantityKg: numeric("quantity_kg").default("0"),
  unitPriceEtb: numeric("unit_price_etb").default("0"),
  totalCostEtb: numeric("total_cost_etb").default("0"),
  warehouse: text("warehouse"),
  certifications: text("certifications").default("[]"),
  status: text("status").default("Sourced"),
  paymentStatus: text("payment_status").default("Unpaid"),
  purchaseDate: text("purchase_date"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

// CAD (Cash Against Documents) — export payment instrument
export const cads = pgTable("cads", {
  id: varchar("id").primaryKey(),
  cadNumber: text("cad_number").notNull(),
  buyerName: text("buyer_name").notNull(),
  buyerAddress: text("buyer_address"),
  buyerCountry: text("buyer_country"),
  buyerBank: text("buyer_bank"),
  buyerSwift: text("buyer_swift"),
  productDescription: text("product_description"),
  quantityKg: numeric("quantity_kg").default("0"),
  unitPriceUsd: numeric("unit_price_usd").default("0"),
  fobValueUsd: numeric("fob_value_usd").default("0"),
  freightUsd: numeric("freight_usd").default("0"),
  insuranceUsd: numeric("insurance_usd").default("0"),
  totalContractUsd: numeric("total_contract_usd").default("0"),
  exchangeRate: numeric("exchange_rate").default("157.50"),
  bankCommissionPct: numeric("bank_commission_pct").default("1"),
  nbeRetentionPct: numeric("nbe_retention_pct").default("30"),
  paymentTerms: text("payment_terms").default("Sight"),
  documentsRequired: text("documents_required").default("[]"),
  contractDate: text("contract_date"),
  shipmentDate: text("shipment_date"),
  status: text("status").default("Draft"),
  paidStatus: text("paid_status").default("unpaid"),
  createdAt: text("created_at").notNull(),
});

// Export Shipments
export const exportShipments = pgTable("export_shipments", {
  id: varchar("id").primaryKey(),
  exportRef: text("export_ref").notNull(),
  cadId: varchar("cad_id"),
  origin: text("origin").notNull(),
  port: text("port").default("Djibouti"),
  destination: text("destination").notNull(),
  destinationCountry: text("destination_country"),
  buyerName: text("buyer_name"),
  status: text("status").default("Preparing"),
  etdDate: text("etd_date"),
  etaDate: text("eta_date"),
  vesselName: text("vessel_name"),
  containerNumber: text("container_number"),
  blNumber: text("bl_number"),
  declarationNumber: text("declaration_number"),
  productDescription: text("product_description"),
  quantityKg: numeric("quantity_kg").default("0"),
  fobValueUsd: numeric("fob_value_usd").default("0"),
  freightUsd: numeric("freight_usd").default("0"),
  insuranceEtb: numeric("insurance_etb").default("0"),
  inlandTransportEtb: numeric("inland_transport_etb").default("0"),
  customsClearanceEtb: numeric("customs_clearance_etb").default("0"),
  portHandlingEtb: numeric("port_handling_etb").default("0"),
  documents: text("documents").default("[]"),
  certifications: text("certifications").default("[]"),
  createdAt: text("created_at").notNull(),
});

// === FINANCE MODULE ===

// Expenses
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey(),
  expenseTitle: text("expense_title").notNull(),
  category: text("category").notNull(),
  expenseDate: text("expense_date").notNull(),
  amountEtb: numeric("amount_etb").notNull().default("0"),
  vatAmountEtb: numeric("vat_amount_etb").default("0"),
  currency: text("currency").default("ETB"),
  paymentMethod: text("payment_method").default("Cash"),
  paidBy: text("paid_by"),
  department: text("department"),
  referenceNumber: text("reference_number"),
  description: text("description"),
  approvalStatus: text("approval_status").default("Approved"),
  createdAt: text("created_at").notNull(),
});

// Petty Cash Accounts
export const pettyCashAccounts = pgTable("petty_cash_accounts", {
  id: varchar("id").primaryKey(),
  holderName: text("holder_name").notNull(),
  department: text("department"),
  assignedAmountEtb: numeric("assigned_amount_etb").notNull().default("0"),
  balanceEtb: numeric("balance_etb").notNull().default("0"),
  lowBalanceThresholdEtb: numeric("low_balance_threshold_etb").default("1000"),
  status: text("status").default("Active"),
  createdAt: text("created_at").notNull(),
});

// Petty Cash Transactions
export const pettyCashTransactions = pgTable("petty_cash_transactions", {
  id: varchar("id").primaryKey(),
  accountId: varchar("account_id").notNull(),
  transactionType: text("transaction_type").notNull(),
  amountEtb: numeric("amount_etb").notNull().default("0"),
  purpose: text("purpose"),
  category: text("category"),
  remarks: text("remarks"),
  transactionDate: text("transaction_date").notNull(),
  createdAt: text("created_at").notNull(),
});

// Supplier Payments (Accounts Payable)
export const supplierPayments = pgTable("supplier_payments", {
  id: varchar("id").primaryKey(),
  supplierName: text("supplier_name").notNull(),
  linkedLcId: varchar("linked_lc_id"),
  linkedShipmentId: varchar("linked_shipment_id"),
  invoiceNumber: text("invoice_number"),
  invoiceDate: text("invoice_date"),
  dueDate: text("due_date"),
  paidDate: text("paid_date"),
  totalAmountEtb: numeric("total_amount_etb").notNull().default("0"),
  paidAmountEtb: numeric("paid_amount_etb").default("0"),
  currency: text("currency").default("ETB"),
  paymentMethod: text("payment_method"),
  status: text("status").default("Pending"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

// Customer Payments (Accounts Receivable)
export const customerPayments = pgTable("customer_payments", {
  id: varchar("id").primaryKey(),
  buyerName: text("buyer_name").notNull(),
  linkedCadId: varchar("linked_cad_id"),
  invoiceNumber: text("invoice_number"),
  invoiceDate: text("invoice_date"),
  dueDate: text("due_date"),
  receivedDate: text("received_date"),
  totalAmountEtb: numeric("total_amount_etb").notNull().default("0"),
  receivedAmountEtb: numeric("received_amount_etb").default("0"),
  currency: text("currency").default("ETB"),
  paymentMethod: text("payment_method"),
  status: text("status").default("Pending"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

// Executive Reports (CEO archive)
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey(),
  title: text("title").notNull(),
  periodLabel: text("period_label").notNull(),
  fromDate: text("from_date").notNull(),
  toDate: text("to_date").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
});

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });

export const COMPANY_CATEGORIES = ["export", "import", "export_import", "other"] as const;
export const insertDemoRequestSchema = createInsertSchema(demoRequests)
  .omit({ id: true, createdAt: true, status: true });
// Validation used for the public demo-request submission.
export const demoRequestSubmissionSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name"),
  companyName: z.string().trim().min(1, "Please enter your company name"),
  companyCategory: z.enum(COMPANY_CATEGORIES, {
    errorMap: () => ({ message: "Please select your company category" }),
  }),
  categoryOther: z.string().trim().max(200).optional().nullable(),
  position: z.string().trim().min(1, "Please enter your position"),
  phone: z.string().trim().min(1, "Please enter your phone number"),
  email: z.string().trim().email("Please enter a valid email"),
}).refine(
  (d) => d.companyCategory !== "other" || (d.categoryOther && d.categoryOther.trim().length > 0),
  { message: "Please describe your company category", path: ["categoryOther"] },
);
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });
export const insertLcSchema = createInsertSchema(lcs).omit({ id: true, createdAt: true });
export const insertShipmentSchema = createInsertSchema(shipments).omit({ id: true, createdAt: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, createdAt: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true });
export const insertBankSchema = createInsertSchema(banks).omit({ id: true, createdAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export const insertBuyerSchema = createInsertSchema(buyers).omit({ id: true, createdAt: true });
export const insertCertificationSchema = createInsertSchema(certifications).omit({ id: true, createdAt: true });
export const insertExportPurchaseSchema = createInsertSchema(exportPurchases).omit({ id: true, createdAt: true });
export const insertCadSchema = createInsertSchema(cads).omit({ id: true, createdAt: true });
export const insertExportShipmentSchema = createInsertSchema(exportShipments).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export const insertPettyCashAccountSchema = createInsertSchema(pettyCashAccounts).omit({ id: true, createdAt: true });
export const insertPettyCashTransactionSchema = createInsertSchema(pettyCashTransactions)
  .omit({ id: true, createdAt: true })
  .extend({
    transactionType: z.enum(["credit", "debit"]),
    amountEtb: z.string().refine(v => Number(v) > 0, { message: "Amount must be > 0" }),
  });
const nonNegativeNumericStr = z.string().refine(v => Number(v) >= 0 && isFinite(Number(v)), { message: "Must be a non-negative number" });
const supplierPaymentBase = createInsertSchema(supplierPayments)
  .omit({ id: true, createdAt: true })
  .extend({
    totalAmountEtb: nonNegativeNumericStr,
    paidAmountEtb: nonNegativeNumericStr.optional(),
  });
export const insertSupplierPaymentSchema = supplierPaymentBase.refine(
  d => Number(d.paidAmountEtb ?? 0) <= Number(d.totalAmountEtb),
  { message: "Paid amount cannot exceed total amount", path: ["paidAmountEtb"] },
);
export const updateSupplierPaymentSchema = supplierPaymentBase.partial().refine(
  d => d.totalAmountEtb === undefined || Number(d.paidAmountEtb ?? 0) <= Number(d.totalAmountEtb),
  { message: "Paid amount cannot exceed total amount", path: ["paidAmountEtb"] },
);

const customerPaymentBase = createInsertSchema(customerPayments)
  .omit({ id: true, createdAt: true })
  .extend({
    totalAmountEtb: nonNegativeNumericStr,
    receivedAmountEtb: nonNegativeNumericStr.optional(),
  });
export const insertCustomerPaymentSchema = customerPaymentBase.refine(
  d => Number(d.receivedAmountEtb ?? 0) <= Number(d.totalAmountEtb),
  { message: "Received amount cannot exceed total amount", path: ["receivedAmountEtb"] },
);
export const updateCustomerPaymentSchema = customerPaymentBase.partial().refine(
  d => d.totalAmountEtb === undefined || Number(d.receivedAmountEtb ?? 0) <= Number(d.totalAmountEtb),
  { message: "Received amount cannot exceed total amount", path: ["receivedAmountEtb"] },
);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LC = typeof lcs.$inferSelect;
export type InsertLC = z.infer<typeof insertLcSchema>;
export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type InventoryItem = typeof inventory.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventorySchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type SaleLineItem = {
  inventoryId: string;
  serialNumber: string;
  descriptionOfGoods: string;
  warehouse?: string;
  unitPriceEtb: string;
};
export type AvailableSerial = {
  serialNumber: string;
  inventoryId: string;
  descriptionOfGoods: string;
  warehouse: string;
  shipmentRef: string | null;
  unitSalePriceEtb: string;
};
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type Bank = typeof banks.$inferSelect;
export type InsertBank = z.infer<typeof insertBankSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Buyer = typeof buyers.$inferSelect;
export type InsertBuyer = z.infer<typeof insertBuyerSchema>;
export type Certification = typeof certifications.$inferSelect;
export type InsertCertification = z.infer<typeof insertCertificationSchema>;
export type CompanySettings = typeof companySettings.$inferSelect;
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type ExportPurchase = typeof exportPurchases.$inferSelect;
export type InsertExportPurchase = z.infer<typeof insertExportPurchaseSchema>;
export type Cad = typeof cads.$inferSelect;
export type InsertCad = z.infer<typeof insertCadSchema>;
export type ExportShipment = typeof exportShipments.$inferSelect;
export type InsertExportShipment = z.infer<typeof insertExportShipmentSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type PettyCashAccount = typeof pettyCashAccounts.$inferSelect;
export type InsertPettyCashAccount = z.infer<typeof insertPettyCashAccountSchema>;
export type PettyCashTransaction = typeof pettyCashTransactions.$inferSelect;
export type InsertPettyCashTransaction = z.infer<typeof insertPettyCashTransactionSchema>;
export type SupplierPayment = typeof supplierPayments.$inferSelect;
export type InsertSupplierPayment = z.infer<typeof insertSupplierPaymentSchema>;
export type CustomerPayment = typeof customerPayments.$inferSelect;
export type InsertCustomerPayment = z.infer<typeof insertCustomerPaymentSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type DemoRequest = typeof demoRequests.$inferSelect;
export type InsertDemoRequest = z.infer<typeof insertDemoRequestSchema>;

// ===================================================================
// Telegram AI Sales Bot / Lead CRM
// Company leads (import-export, manufacturing, kindergarten academies)
// flow through a manual CEO approval gate before any automated outreach.
// ===================================================================

// A discovered or imported company lead.
export const salesLeads = pgTable("sales_leads", {
  id: varchar("id").primaryKey(),
  companyName: text("company_name").notNull(),
  // import_export | manufacturing | kindergarten_academy | other
  segment: text("segment").notNull().default("import_export"),
  contactName: text("contact_name"),
  contactTitle: text("contact_title"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  location: text("location"),
  // manual | csv | ai_discovery | telegram_inbound
  source: text("source").notNull().default("manual"),
  notes: text("notes"),
  aiScore: numeric("ai_score").notNull().default("0"),
  aiQualification: text("ai_qualification"),
  aiPitch: text("ai_pitch"),
  telegramChatId: text("telegram_chat_id"),
  telegramUsername: text("telegram_username"),
  // discovered | approved | rejected | contacted | in_conversation | meeting_booked | won | lost
  status: text("status").notNull().default("discovered"),
  createdAt: text("created_at").notNull(),
});

export const insertSalesLeadSchema = createInsertSchema(salesLeads).omit({
  id: true,
  createdAt: true,
  status: true,
  telegramChatId: true,
  telegramUsername: true,
});

// One message in a Telegram sales conversation (or an internal note).
export const salesMessages = pgTable("sales_messages", {
  id: varchar("id").primaryKey(),
  leadId: varchar("lead_id").notNull(),
  direction: text("direction").notNull(), // inbound | outbound
  channel: text("channel").notNull().default("telegram"), // telegram | note
  body: text("body").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertSalesMessageSchema = createInsertSchema(salesMessages).omit({
  id: true,
  createdAt: true,
});

// A scheduled physical meeting or demo presentation with a lead.
export const salesMeetings = pgTable("sales_meetings", {
  id: varchar("id").primaryKey(),
  leadId: varchar("lead_id").notNull(),
  title: text("title").notNull(),
  scheduledAt: text("scheduled_at").notNull(),
  location: text("location"),
  mode: text("mode").notNull().default("physical"), // physical | demo | online
  notes: text("notes"),
  status: text("status").notNull().default("proposed"), // proposed | confirmed | completed | cancelled
  createdAt: text("created_at").notNull(),
});

export const insertSalesMeetingSchema = createInsertSchema(salesMeetings).omit({
  id: true,
  createdAt: true,
});

// An admin-defined bookable availability slot. The CEO pre-fills morning/evening
// slots for the month in advance; the bot offers only these times and books one
// when a lead agrees.
export const salesSlots = pgTable("sales_slots", {
  id: varchar("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD (East Africa Time)
  period: text("period").notNull(), // morning | evening
  startTime: text("start_time").notNull(), // HH:mm 24h
  status: text("status").notNull().default("available"), // available | booked
  meetingId: varchar("meeting_id"), // set when this slot is booked
  createdAt: text("created_at").notNull(),
});

export const insertSalesSlotSchema = createInsertSchema(salesSlots).omit({
  id: true,
  createdAt: true,
  status: true,
  meetingId: true,
});

// Single-row configuration for the AI sales agent + discovery engine.
export const salesBotConfig = pgTable("sales_bot_config", {
  id: varchar("id").primaryKey(),
  companyName: text("company_name").notNull().default("EXIMMAN"),
  productCatalog: text("product_catalog").notNull().default(""),
  persona: text("persona").notNull().default(""),
  autoReplyEnabled: boolean("auto_reply_enabled").notNull().default(true),
  // When on, approving a reachable lead immediately sends the AI opener and the
  // bot drives the conversation toward a meeting without manual prompting.
  autoOutreachEnabled: boolean("auto_outreach_enabled").notNull().default(true),
  dailyDiscoveryEnabled: boolean("daily_discovery_enabled").notNull().default(false),
  meetingLink: text("meeting_link"),
  // Telegram chat ID of the admin/CEO who receives meeting-booked alerts.
  adminChatId: text("admin_chat_id"),
  updatedAt: text("updated_at").notNull(),
});

export const updateSalesBotConfigSchema = createInsertSchema(salesBotConfig)
  .omit({ id: true, updatedAt: true })
  .partial();

export type SalesLead = typeof salesLeads.$inferSelect;
export type InsertSalesLead = z.infer<typeof insertSalesLeadSchema>;
export type SalesMessage = typeof salesMessages.$inferSelect;
export type InsertSalesMessage = z.infer<typeof insertSalesMessageSchema>;
export type SalesMeeting = typeof salesMeetings.$inferSelect;
export type InsertSalesMeeting = z.infer<typeof insertSalesMeetingSchema>;
export type SalesBotConfig = typeof salesBotConfig.$inferSelect;
export type UpdateSalesBotConfig = z.infer<typeof updateSalesBotConfigSchema>;
export type SalesSlot = typeof salesSlots.$inferSelect;
export type InsertSalesSlot = z.infer<typeof insertSalesSlotSchema>;
