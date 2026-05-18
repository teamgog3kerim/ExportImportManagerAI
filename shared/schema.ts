import { pgTable, text, varchar, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
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
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });
export const insertLcSchema = createInsertSchema(lcs).omit({ id: true, createdAt: true });
export const insertShipmentSchema = createInsertSchema(shipments).omit({ id: true, createdAt: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, createdAt: true });
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
export const insertSupplierPaymentSchema = createInsertSchema(supplierPayments)
  .omit({ id: true, createdAt: true })
  .extend({
    totalAmountEtb: nonNegativeNumericStr,
    paidAmountEtb: nonNegativeNumericStr.optional(),
  })
  .refine(d => Number(d.paidAmountEtb ?? 0) <= Number(d.totalAmountEtb), {
    message: "Paid amount cannot exceed total amount",
    path: ["paidAmountEtb"],
  });
export const insertCustomerPaymentSchema = createInsertSchema(customerPayments)
  .omit({ id: true, createdAt: true })
  .extend({
    totalAmountEtb: nonNegativeNumericStr,
    receivedAmountEtb: nonNegativeNumericStr.optional(),
  })
  .refine(d => Number(d.receivedAmountEtb ?? 0) <= Number(d.totalAmountEtb), {
    message: "Received amount cannot exceed total amount",
    path: ["receivedAmountEtb"],
  });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LC = typeof lcs.$inferSelect;
export type InsertLC = z.infer<typeof insertLcSchema>;
export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type InventoryItem = typeof inventory.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventorySchema>;
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
