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
// sign-up -> blocked while pending -> admin approval -> login works ->
// view-only writes blocked while record writes succeed -> non-admins are
// kept out of the admin user-management endpoints.
//
// This runs against the real auth routes (server/auth.ts) and the real RBAC
// guard + permission rules (shared/permissions.ts). User accounts are stored in
// the real Postgres database, so the test creates a uniquely-named employee and
// removes it again in teardown. Business data (inventory, LCs, ...) lives in the
// in-memory storage of this test's own process and never touches shared state.

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

let server: Server;
let baseUrl: string;
let employeeId: string;

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

  // Make sure no leftover row from a previous aborted run collides.
  await db.delete(users).where(eq(users.email, TEST_EMAIL.toLowerCase()));
});

after(async () => {
  if (employeeId) {
    await db.delete(users).where(eq(users.id, employeeId));
  } else {
    await db.delete(users).where(eq(users.email, TEST_EMAIL.toLowerCase()));
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await pool.end();
});

test("self sign-up is disabled for visitors", async () => {
  const anon = makeAgent(baseUrl);
  const res = await anon("POST", "/api/auth/signup", {
    fullName: "E2E Employee",
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  assert.equal(res.status, 403, "public self sign-up must be disabled");
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

test("non-admins cannot reach admin user-management endpoints", async () => {
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
});
