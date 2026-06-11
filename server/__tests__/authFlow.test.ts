import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "http";
import { eq } from "drizzle-orm";

import { setupSession, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD } from "../auth";
import { registerRoutes } from "../routes";
import { db, pool } from "../db";
import { users } from "@shared/schema";

// End-to-end coverage of the most security-sensitive flow in the app:
// admin-controlled public sign-up toggle -> sign-up blocked while disabled ->
// admin can create active employees -> admin can enable sign-up so visitors
// self-register (pending) -> login rules -> view-only vs record writes ->
// non-admins are kept out of admin-only endpoints (incl. the sign-up toggle).
//
// This runs against the real auth routes (server/auth.ts) and the real RBAC
// guard + permission rules (shared/permissions.ts). User accounts and the
// app_settings row live in the real Postgres database, so the test creates
// uniquely-named rows and restores the original sign-up setting in teardown.
// Business data (inventory, LCs, ...) lives in the in-memory storage of this
// test's own process and never touches shared state.

// A tiny cookie-jar-backed HTTP client so each "agent" keeps its own session,
// exactly like a separate browser would.
function makeAgent(baseUrl: string) {
  let cookie = "";
  return async function request(method: string, path: string, body?: unknown) {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["content-type"] = "application/json";
    if (cookie) headers["cookie"] = cookie;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    return { status: res.status, body: json };
  };
}

const TEST_EMAIL = `e2e-employee-${Date.now()}@example.test`;
const TEST_PASSWORD = "EmployeePass123!";
const SELF_SIGNUP_EMAIL = `e2e-selfsignup-${Date.now()}@example.test`;

let server: Server;
let baseUrl: string;
let employeeId: string;
let originalSignupSetting = "false";

async function setSignupEnabledDirect(enabled: boolean) {
  await pool.query(
    `INSERT INTO app_settings (key, value) VALUES ('signup_enabled', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [enabled ? "true" : "false"],
  );
}

before(async () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  setupSession(app);
  // registerRoutes wires the real RBAC guard, auth routes, admin user-management
  // routes, and the business API routes, then ensures the bootstrap admin exists.
  server = await registerRoutes(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Failed to bind test server");
  baseUrl = `http://127.0.0.1:${addr.port}`;

  // Remember the live setting so we can restore it, then start from "disabled".
  const { rows } = await pool.query<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = 'signup_enabled'`,
  );
  originalSignupSetting = rows[0]?.value ?? "false";
  await setSignupEnabledDirect(false);

  // Make sure no leftover rows from a previous aborted run collide.
  await db.delete(users).where(eq(users.email, TEST_EMAIL.toLowerCase()));
  await db.delete(users).where(eq(users.email, SELF_SIGNUP_EMAIL.toLowerCase()));
});

after(async () => {
  if (employeeId) {
    await db.delete(users).where(eq(users.id, employeeId));
  } else {
    await db.delete(users).where(eq(users.email, TEST_EMAIL.toLowerCase()));
  }
  await db.delete(users).where(eq(users.email, SELF_SIGNUP_EMAIL.toLowerCase()));
  // Restore whatever the live app had configured before the test ran.
  await setSignupEnabledDirect(originalSignupSetting === "true");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});

test("self sign-up is disabled by default for visitors", async () => {
  const anon = makeAgent(baseUrl);
  const status = await anon("GET", "/api/auth/signup-status");
  assert.equal(status.status, 200);
  assert.equal(status.body.enabled, false, "sign-up status should report disabled");

  const res = await anon("POST", "/api/auth/signup", {
    fullName: "E2E Employee",
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert.equal(res.status, 403, "public self sign-up must be blocked while disabled");
});

test("an admin can create an active employee directly", async () => {
  const admin = makeAgent(baseUrl);
  const login = await admin("POST", "/api/auth/login", {
    email: BOOTSTRAP_ADMIN_EMAIL,
    password: BOOTSTRAP_ADMIN_PASSWORD,
  });
  assert.equal(login.status, 200, "bootstrap admin should log in");
  assert.equal(login.body.role, "admin");

  // Admins onboard demo requesters directly. The new account is active
  // immediately. Created as "staff" -> staff defaults give:
  // import-inventory=record (write allowed), import-lc=view (read-only),
  // finance=none (no access).
  const created = await admin("POST", "/api/users", {
    fullName: "E2E Employee",
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    role: "staff",
  });
  assert.equal(created.status, 201, `admin create should succeed: ${JSON.stringify(created.body)}`);
  assert.equal(created.body.status, "active");
  assert.equal(created.body.role, "staff");
  employeeId = created.body.id;
});

test("an admin can enable public sign-up so visitors can self-register, then disable it again", async () => {
  const admin = makeAgent(baseUrl);
  await admin("POST", "/api/auth/login", {
    email: BOOTSTRAP_ADMIN_EMAIL,
    password: BOOTSTRAP_ADMIN_PASSWORD,
  });

  // Enable.
  const enable = await admin("PATCH", "/api/settings/signup", { enabled: true });
  assert.equal(enable.status, 200, `admin should be able to enable sign-up: ${JSON.stringify(enable.body)}`);
  assert.equal(enable.body.enabled, true);

  // Visitor now sees it enabled and can register (account is pending).
  const anon = makeAgent(baseUrl);
  const status = await anon("GET", "/api/auth/signup-status");
  assert.equal(status.body.enabled, true);
  const signup = await anon("POST", "/api/auth/signup", {
    fullName: "Self Signup",
    email: SELF_SIGNUP_EMAIL,
    password: TEST_PASSWORD,
  });
  assert.equal(signup.status, 201, `visitor should be able to self-register when enabled: ${JSON.stringify(signup.body)}`);

  // A self-registered account is pending, so it cannot log in yet.
  const pendingLogin = await anon("POST", "/api/auth/login", {
    email: SELF_SIGNUP_EMAIL,
    password: TEST_PASSWORD,
  });
  assert.equal(pendingLogin.status, 403, "pending self-registered account must not log in");

  // Disable again.
  const disable = await admin("PATCH", "/api/settings/signup", { enabled: false });
  assert.equal(disable.status, 200);
  assert.equal(disable.body.enabled, false);

  const blocked = await anon("POST", "/api/auth/signup", {
    fullName: "Too Late",
    email: `e2e-toolate-${Date.now()}@example.test`,
    password: TEST_PASSWORD,
  });
  assert.equal(blocked.status, 403, "sign-up must be blocked again once disabled");
});

test("an admin-created employee can log in", async () => {
  const employee = makeAgent(baseUrl);
  const res = await employee("POST", "/api/auth/login", {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert.equal(res.status, 200, "active account should log in");
  assert.equal(res.body.status, "active");
});

test("permission rules: view-only writes are blocked, record writes succeed", async () => {
  const employee = makeAgent(baseUrl);
  const login = await employee("POST", "/api/auth/login", {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert.equal(login.status, 200);

  // import-lc = view -> reading is allowed.
  const readView = await employee("GET", "/api/lcs");
  assert.equal(readView.status, 200, "view access should allow reads");

  // import-lc = view -> writing must be blocked with a view-only error.
  const writeView = await employee("POST", "/api/lcs", {
    lcNumber: "LC-E2E-1",
    issuingBank: "Test Bank",
    issueDate: "2026-01-01",
    expiryDate: "2026-06-01",
    supplierName: "Test Supplier",
  });
  assert.equal(writeView.status, 403, "view-only users must not be able to write");

  // import-inventory = record -> writing must be permitted by the guard.
  const writeRecord = await employee("POST", "/api/inventory", {
    descriptionOfGoods: "E2E widget",
    warehouse: "Test WH",
  });
  assert.equal(writeRecord.status, 201, `record users should be able to write: ${JSON.stringify(writeRecord.body)}`);

  // finance = none -> no access at all, even for reads.
  const noAccess = await employee("GET", "/api/finance/expenses");
  assert.equal(noAccess.status, 403, "none-level pages must be fully blocked");
});

test("non-admins cannot reach admin user-management or the sign-up toggle", async () => {
  const employee = makeAgent(baseUrl);
  await employee("POST", "/api/auth/login", {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  const list = await employee("GET", "/api/users");
  assert.equal(list.status, 403, "staff must not list users");

  const create = await employee("POST", "/api/users", {
    fullName: "Sneaky User",
    email: `sneaky-${Date.now()}@example.test`,
    password: "Password123!",
    role: "admin",
  });
  assert.equal(create.status, 403, "staff must not create users");

  const approve = await employee("POST", `/api/users/${employeeId}/approve`, { role: "admin" });
  assert.equal(approve.status, 403, "staff must not approve users");

  const patch = await employee("PATCH", `/api/users/${employeeId}`, { role: "admin" });
  assert.equal(patch.status, 403, "staff must not edit users");

  const toggle = await employee("PATCH", "/api/settings/signup", { enabled: true });
  assert.equal(toggle.status, 403, "staff must not change the sign-up setting");
});
