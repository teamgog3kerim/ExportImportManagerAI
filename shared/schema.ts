import { pgTable, text, varchar, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const shipments = pgTable("shipments", {
  id: varchar("id").primaryKey(),
  supplier: text("supplier").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  status: text("status").notNull(),
  eta: text("eta").notNull(),
  value: text("value").notNull(),
  description: text("description"),
  lcId: varchar("lc_id"),
  createdAt: text("created_at").notNull(),
});

export const lcs = pgTable("lcs", {
  id: varchar("id").primaryKey(),
  bank: text("bank").notNull(),
  beneficiary: text("beneficiary").notNull(),
  amount: text("amount").notNull(),
  openDate: text("open_date").notNull(),
  expiry: text("expiry").notNull(),
  status: text("status").notNull(),
  currency: text("currency").notNull(),
  createdAt: text("created_at").notNull(),
});

export const budgetCategories = pgTable("budget_categories", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  allocated: numeric("allocated").notNull(),
  spent: numeric("spent").notNull().default("0"),
  createdAt: text("created_at").notNull(),
});

export const whatsappConfig = pgTable("whatsapp_config", {
  id: varchar("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  isConnected: text("is_connected").notNull().default("false"),
  reportTime: text("report_time").notNull().default("08:00"),
  lastSentAt: text("last_sent_at"),
});

export const insertShipmentSchema = createInsertSchema(shipments).omit({ id: true, createdAt: true });
export const insertLcSchema = createInsertSchema(lcs).omit({ id: true, createdAt: true });
export const insertBudgetCategorySchema = createInsertSchema(budgetCategories).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Shipment = typeof shipments.$inferSelect;
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type LC = typeof lcs.$inferSelect;
export type InsertLC = z.infer<typeof insertLcSchema>;
export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type InsertBudgetCategory = z.infer<typeof insertBudgetCategorySchema>;
export type WhatsappConfig = typeof whatsappConfig.$inferSelect;
