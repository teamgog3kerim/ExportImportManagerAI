import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db, pool } from "./db";
import { users, demoRequests, demoRequestSubmissionSchema } from "@shared/schema";
import {
  defaultPermsForRole,
  isReadStylePost,
  pageForApiPath,
  type PermLevel,
  type Role,
} from "@shared/permissions";

const scryptAsync = promisify(scrypt);

export const BOOTSTRAP_ADMIN_EMAIL = "teamgog3@gmail.com";
export const BOOTSTRAP_ADMIN_PASSWORD = "WeyMerSar@Hon13Ker29";
const BOOTSTRAP_ADMIN_NAME = "Midas Admin";

export type SafeUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  permissions: Record<string, PermLevel>;
  createdAt: string;
};

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function verifyPassword(stored: string, supplied: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  if (hashedBuf.length !== suppliedBuf.length) return false;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function toSafeUser(u: typeof users.$inferSelect): SafeUser {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    status: u.status,
    permissions: (u.permissions ?? {}) as Record<string, PermLevel>,
    createdAt: u.createdAt,
  };
}

export async function getUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

async function getUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return rows[0];
}

export async function ensureBootstrapAdmin() {
  const existing = await getUserByEmail(BOOTSTRAP_ADMIN_EMAIL);
  if (existing) return;
  await db.insert(users).values({
    id: randomUUID(),
    email: BOOTSTRAP_ADMIN_EMAIL.toLowerCase(),
    passwordHash: await hashPassword(BOOTSTRAP_ADMIN_PASSWORD),
    fullName: BOOTSTRAP_ADMIN_NAME,
    role: "admin",
    status: "active",
    permissions: defaultPermsForRole("admin"),
    createdAt: new Date().toISOString(),
  });
  // eslint-disable-next-line no-console
  console.log("[auth] Bootstrap admin account ensured.");
}

export function setupSession(app: Express) {
  const PgSession = connectPgSimple(session);
  app.set("trust proxy", 1);
  app.use(
    session({
      store: new PgSession({
        pool: pool as any,
        createTableIfMissing: true,
        tableName: "session",
      }),
      secret: process.env.SESSION_SECRET || "eximman-dev-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24 * 30,
      },
    }),
  );
}

// Global guard for all /api routes. Public auth endpoints are skipped.
export function apiAccessGuard() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api/")) return next();
    if (req.path.startsWith("/api/auth/")) return next();

    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const user = await getUserById(userId);
    if (!user || user.status !== "active") {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Account is no longer active" });
    }
    (req as any).currentUser = user;

    if (user.role === "admin") return next();

    // User management is admin-only.
    if (req.path.startsWith("/api/users")) {
      return res.status(403).json({ message: "Administrator access required" });
    }

    const isWrite =
      req.method !== "GET" &&
      req.method !== "HEAD" &&
      req.method !== "OPTIONS" &&
      !isReadStylePost(req.path);

    // Settings sub-resources are shared lookups: any active user may read,
    // only admins may write.
    if (req.path.startsWith("/api/settings")) {
      if (isWrite) return res.status(403).json({ message: "Administrator access required" });
      return next();
    }

    const pageKey = pageForApiPath(req.path);
    // Deny-by-default: any /api route that is not explicitly mapped to a page
    // (and is not an auth/settings/users route handled above) is forbidden for
    // non-admins, so a new unmapped endpoint can never silently bypass RBAC.
    if (!pageKey) {
      return res.status(403).json({ message: "You do not have access to this section" });
    }

    const level: PermLevel = (user.permissions as any)?.[pageKey] ?? "none";
    if (level === "none") {
      return res.status(403).json({ message: "You do not have access to this section" });
    }
    if (isWrite && level !== "record") {
      return res.status(403).json({ message: "You have view-only access to this section" });
    }
    next();
  };
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).currentUser;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Administrator access required" });
  }
  next();
}

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name"),
  email: z.string().trim().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const signupSettingSchema = z.object({
  enabled: z.boolean(),
});

// ----- Public self sign-up toggle (admin-controlled, persisted in Postgres) -----
const SIGNUP_ENABLED_KEY = "signup_enabled";

// Whether visitors may create their own accounts. Defaults to false (disabled)
// if the row is missing for any reason, so the safe path is "request a demo".
export async function isSignupEnabled(): Promise<boolean> {
  const { rows } = await pool.query<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = $1`,
    [SIGNUP_ENABLED_KEY],
  );
  return rows[0]?.value === "true";
}

async function setSignupEnabled(enabled: boolean): Promise<void> {
  await pool.query(
    `INSERT INTO app_settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [SIGNUP_ENABLED_KEY, enabled ? "true" : "false"],
  );
}

const permLevelSchema = z.enum(["none", "view", "record"]);
const updateUserSchema = z.object({
  role: z.enum(["admin", "manager", "staff"]).optional(),
  status: z.enum(["pending", "active", "blocked"]).optional(),
  fullName: z.string().trim().min(2).optional(),
  permissions: z.record(permLevelSchema).optional(),
});

const approveSchema = z.object({
  role: z.enum(["admin", "manager", "staff"]).optional(),
  permissions: z.record(permLevelSchema).optional(),
});

const createUserSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter a full name"),
  email: z.string().trim().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "manager", "staff"]).default("staff"),
});

export function registerAuthRoutes(app: Express) {
  // Public: lets the sign-in / sign-up pages adapt to the admin's choice.
  app.get("/api/auth/signup-status", async (_req, res) => {
    res.json({ enabled: await isSignupEnabled() });
  });

  app.post("/api/auth/signup", async (req, res) => {
    if (!(await isSignupEnabled())) {
      return res.status(403).json({
        message: "Self sign-up is disabled. Please request a demo at merisamarketingsolutions@gmail.com.",
      });
    }
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
    }
    const { fullName, email, password } = parsed.data;
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    await db.insert(users).values({
      id: randomUUID(),
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      fullName,
      role: "staff",
      status: "pending",
      permissions: defaultPermsForRole("staff"),
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({
      message: "Your account has been created and is pending administrator approval.",
    });
  });

  // Public: prospective clients submit a demo request from the sign-up page
  // when self sign-up is disabled. Stored for an admin to review and follow up.
  app.post("/api/auth/demo-request", async (req, res) => {
    const parsed = demoRequestSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
    }
    const d = parsed.data;
    await db.insert(demoRequests).values({
      id: randomUUID(),
      fullName: d.fullName,
      companyName: d.companyName,
      companyCategory: d.companyCategory,
      categoryOther: d.companyCategory === "other" ? d.categoryOther ?? null : null,
      position: d.position,
      phone: d.phone,
      email: d.email,
      status: "new",
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ message: "Your demo request has been received. We'll be in touch shortly." });
  });

  app.post("/api/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Please enter your email and password" });
    }
    const { email, password } = parsed.data;
    const user = await getUserByEmail(email);
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (user.status === "pending") {
      return res.status(403).json({ message: "Your account is awaiting administrator approval" });
    }
    if (user.status === "blocked") {
      return res.status(403).json({ message: "Your access has been disabled. Contact your administrator." });
    }
    req.session.userId = user.id;
    res.json(toSafeUser(user));
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ message: "Signed out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await getUserById(userId);
    if (!user || user.status !== "active") {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Account is no longer active" });
    }
    res.json(toSafeUser(user));
  });

  // ----- Admin: control whether visitors can self sign-up -----
  // Lives under /api/settings so the access guard already forces admin-only on
  // writes; requireAdmin is kept as defense-in-depth.
  app.patch("/api/settings/signup", requireAdmin, async (req, res) => {
    const parsed = signupSettingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input" });
    }
    await setSignupEnabled(parsed.data.enabled);
    res.json({ enabled: parsed.data.enabled });
  });

  // ----- Admin: review demo requests -----
  // Admins bypass the access guard; non-admins are denied (path is unmapped).
  // requireAdmin is kept as defense-in-depth.
  app.get("/api/demo-requests", requireAdmin, async (_req, res) => {
    const rows = await db.select().from(demoRequests).orderBy(desc(demoRequests.createdAt));
    res.json(rows);
  });

  app.patch("/api/demo-requests/:id", requireAdmin, async (req, res) => {
    const status = String(req.body?.status ?? "");
    if (status !== "new" && status !== "contacted") {
      return res.status(400).json({ message: "Invalid status" });
    }
    const rows = await db.select().from(demoRequests).where(eq(demoRequests.id, req.params.id)).limit(1);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Demo request not found" });
    }
    await db.update(demoRequests).set({ status }).where(eq(demoRequests.id, req.params.id));
    res.json({ id: req.params.id, status });
  });

  app.delete("/api/demo-requests/:id", requireAdmin, async (req, res) => {
    await db.delete(demoRequests).where(eq(demoRequests.id, req.params.id));
    res.json({ message: "Deleted" });
  });

  // ----- Admin: user management -----
  app.get("/api/users", requireAdmin, async (_req, res) => {
    const rows = await db.select().from(users);
    res.json(rows.map(toSafeUser));
  });

  // Admins onboard demo requesters directly. Created accounts are active
  // immediately (no pending step) since an administrator vouched for them.
  app.post("/api/users", requireAdmin, async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
    }
    const { fullName, email, password, role } = parsed.data;
    const existing = await getUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }
    const [created] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
        fullName,
        role,
        status: "active",
        permissions: defaultPermsForRole(role),
        createdAt: new Date().toISOString(),
      })
      .returning();
    res.status(201).json(toSafeUser(created));
  });

  app.post("/api/users/:id/approve", requireAdmin, async (req, res) => {
    const parsed = approveSchema.safeParse(req.body ?? {});
    if (!parsed.success) return res.status(400).json({ message: "Invalid input" });
    const target = await getUserById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });
    const role = (parsed.data.role ?? (target.role as Role)) as Role;
    const permissions = parsed.data.permissions ?? defaultPermsForRole(role);
    const [updated] = await db
      .update(users)
      .set({ status: "active", role, permissions })
      .where(eq(users.id, target.id))
      .returning();
    res.json(toSafeUser(updated));
  });

  app.post("/api/users/:id/reject", requireAdmin, async (req, res) => {
    const target = await getUserById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.status !== "pending") {
      return res.status(400).json({ message: "Only pending requests can be rejected" });
    }
    await db.delete(users).where(eq(users.id, target.id));
    res.json({ message: "Request rejected" });
  });

  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid input" });
    }
    const me = (req as any).currentUser;
    const target = await getUserById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });

    const updates = parsed.data;
    // Protect against an admin locking themselves out.
    if (target.id === me.id) {
      if (updates.role && updates.role !== "admin") {
        return res.status(400).json({ message: "You cannot change your own role" });
      }
      if (updates.status && updates.status !== "active") {
        return res.status(400).json({ message: "You cannot change your own status" });
      }
    }
    if (await wouldRemoveLastAdmin(target, updates.role, updates.status)) {
      return res.status(400).json({ message: "There must be at least one active administrator" });
    }

    const [updated] = await db
      .update(users)
      .set({
        ...(updates.role ? { role: updates.role } : {}),
        ...(updates.status ? { status: updates.status } : {}),
        ...(updates.fullName ? { fullName: updates.fullName } : {}),
        ...(updates.permissions ? { permissions: updates.permissions } : {}),
      })
      .where(eq(users.id, target.id))
      .returning();
    res.json(toSafeUser(updated));
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    const me = (req as any).currentUser;
    const target = await getUserById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.id === me.id) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    if (await wouldRemoveLastAdmin(target, undefined, "blocked")) {
      return res.status(400).json({ message: "There must be at least one active administrator" });
    }
    await db.delete(users).where(eq(users.id, target.id));
    res.json({ message: "User removed" });
  });
}

async function wouldRemoveLastAdmin(
  target: typeof users.$inferSelect,
  newRole?: string,
  newStatus?: string,
): Promise<boolean> {
  const wasActiveAdmin = target.role === "admin" && target.status === "active";
  if (!wasActiveAdmin) return false;
  const stillActiveAdmin =
    (newRole ?? target.role) === "admin" && (newStatus ?? target.status) === "active";
  if (stillActiveAdmin) return false;
  const admins = await db.select().from(users).where(eq(users.role, "admin"));
  const activeAdmins = admins.filter((a) => a.status === "active");
  return activeAdmins.length <= 1;
}
