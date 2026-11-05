// Uses the real adjacent frontend BetterAuth configuration, never a mock issuer.
// Creates disposable users/resources only; never drops a database or collection.
import "dotenv/config";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { registerHooks } from "node:module";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "dotenv";
import { MongoClient, ObjectId, BSON } from "mongodb";
import { decodeJwt, SignJWT } from "jose";
import { tsImport } from "tsx/esm/api";

const frontendDir = resolve(process.env.FRONTEND_DIR || "../a-08-client");
if (!existsSync(resolve(frontendDir, "src/lib/auth.ts"))) throw new Error("Set FRONTEND_DIR to the existing Next.js frontend.");
const backendUri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB_NAME || "A08";
const frontendEnv = {};
for (const file of [".env", ".env.local"]) {
  const path = resolve(frontendDir, file);
  if (existsSync(path)) Object.assign(frontendEnv, parse(readFileSync(path)));
}
const authUri = frontendEnv.MONGODB_URI || backendUri;
const dbClient = new MongoClient(backendUri, { serverSelectionTimeoutMS: 10000 });
const authClient = new MongoClient(authUri, { serverSelectionTimeoutMS: 10000 });
const users = [];
const emails = [];
const fixtureBookingIds = [];
const lockIds = [];
process.on("uncaughtException", (error) => {
  console.error(error);
  process.exit(1);
});
let authServer, apiServer, backendClient, auth;
const childProcesses = [];
async function childCheck(source, overrides = {}) {
  const child = spawn(process.execPath, ["--input-type=module", "-e", source], {
    cwd: resolve(import.meta.dirname, ".."), env: { ...process.env, ...overrides }, stdio: ["ignore", "pipe", "pipe"],
  });
  childProcesses.push(child);
  let output = "";
  child.stdout.on("data", (part) => { output += part; });
  child.stderr.on("data", (part) => { output += part; });
  const timer = setTimeout(() => child.kill("SIGTERM"), 30000);
  const code = await new Promise((done) => child.once("exit", done));
  clearTimeout(timer);
  assert.equal(code, 0, `Child verification failed: ${output}`);
  return output;
}
let checks = 0;
const pass = (message) => { checks++; console.log(`PASS ${message}`); };
const digest = (docs) => createHash("sha256").update(BSON.EJSON.stringify(docs)).digest("hex");
let snapshots;
let db, authDb, originalJwks;
const listen = (server) => new Promise((done) => server.listen(0, "127.0.0.1", done));
async function request(base, path, user, method = "GET", body, extra = {}) {
  const response = await fetch(`${base}${path}`, {
    method, headers: { ...(user ? { cookie: user.cookie, authorization: `Bearer ${user.token}` } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}), ...extra },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
  });
  return { status: response.status, headers: response.headers, data: await response.json() };
}
try {
  await Promise.all([dbClient.connect(), authClient.connect()]);
  db = dbClient.db(databaseName);
  authDb = authClient.db();
  snapshots = await Promise.all(["facilities", "facilitiesBooking"].map(async (name) => ({ name, docs: await db.collection(name).find().sort({ _id: 1 }).toArray() })));
  originalJwks = await authDb.collection("jwks").find().project({ _id: 1 }).toArray();
  registerHooks({ resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: new URL("./server-only.cjs", import.meta.url).href, shortCircuit: true };
    return nextResolve(specifier, context);
  } });
  authServer = createServer(async (incoming, outgoing) => {
    try {
      const chunks = [];
      for await (const chunk of incoming) chunks.push(chunk);
      const method = incoming.method;
      const request = new Request(`http://127.0.0.1:${authServer.address().port}${incoming.url}`, {
        method, headers: incoming.headers,
        ...(!["GET", "HEAD"].includes(method) ? { body: Buffer.concat(chunks) } : {}),
      });
      const response = await auth.handler(request);
      outgoing.statusCode = response.status;
      response.headers.forEach((value, name) => { if (name !== "set-cookie") outgoing.setHeader(name, value); });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) outgoing.setHeader("set-cookie", cookies);
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      outgoing.statusCode = 500;
      outgoing.end("{}");
    }
  });
  await listen(authServer);
  const issuer = `http://127.0.0.1:${authServer.address().port}`;
  Object.assign(process.env, {
    NODE_ENV: "development", API_AUTH_MODE: "jwt", JWT_AUDIENCE: "studiospace-integration",
    BETTER_AUTH_URL: issuer, NEXT_PUBLIC_AUTH_URL: issuer, AUTH_TRUSTED_ORIGINS: "",
    MONGODB_URI: authUri, BETTER_AUTH_SECRET: frontendEnv.BETTER_AUTH_SECRET || randomUUID().repeat(2),
    GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "",
  });
  const frontendModule = await tsImport(pathToFileURL(resolve(frontendDir, "src/lib/auth.ts")).href, {
    parentURL: import.meta.url, tsconfig: resolve(frontendDir, "tsconfig.json"),
  });
  ({ auth } = frontendModule.getAuth());
  Object.assign(process.env, {
    MONGODB_URI: backendUri, MONGODB_DB_NAME: databaseName, CLIENT_URL: issuer, AUTH_BASE_URL: issuer,
    JWT_ISSUER: issuer, JWT_JWKS_URL: `${issuer}/api/auth/jwks`, VERCEL: "1",
  });
  delete process.env.CLIENT_ORIGIN;
  const { default: app } = await import("../index.js");
  ({ client: backendClient } = await import("../database.js"));
  apiServer = app.listen(0, "127.0.0.1");
  await new Promise((done) => apiServer.once("listening", done));
  const api = `http://127.0.0.1:${apiServer.address().port}`;
  const call = (path, user, method, body, extra) => request(api, path, user, method, body, extra);
  assert.equal((await call("/health")).status, 200);
  assert.equal((await call("/")).status, 200);
  const all = await call("/facilities");
  assert.equal(all.status, 200);
  assert.ok(Array.isArray(all.data));
  if (all.data.length) assert.deepEqual((await call(`/facilities/${all.data[0]._id}`)).data, all.data[0]);
  const featured = await call("/facilities/featured");
  assert.equal(featured.status, 200);
  assert.equal(featured.data.length, Math.min(6, all.data.length));
  assert.equal((await call("/facilities/invalid")).status, 400);
  assert.equal((await call(`/facilities/${new ObjectId()}`)).status, 404);
  assert.equal((await call("/missing")).status, 404);
  pass("serverless app export, MongoDB ping, public list/detail/featured, JSON 400/404");
  for (const [path, method] of [["/facilities/mine", "GET"], ["/facilities/my", "GET"], ["/facilities", "POST"], ["/facilities/booking", "GET"], ["/facilities/booking", "POST"], ["/facilities/booking/invalid", "GET"], ["/facilities/booking/invalid", "DELETE"], ["/facilities/invalid", "PATCH"], ["/facilities/invalid", "PUT"], ["/facilities/invalid", "DELETE"]]) {
    assert.equal((await call(path, null, method)).status, 401, `${method} ${path}`);
  }
  pass("all private routes reject missing authentication");
  for (let index = 0; index < 2; index++) {
    const email = `studiospace-audit-${randomUUID()}@example.test`;
    emails.push(email);
    const created = await request(issuer, "/api/auth/sign-up/email", null, "POST", {
      email, name: `Disposable Audit ${index}`, password: `Test!Aa1${randomUUID()}`,
    }, { origin: issuer });
    assert.equal(created.status, 200);
    const cookie = created.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
    const user = { ...created.data.user, cookie };
    users.push(user);
    const headers = new Headers({ cookie });
    user.token = (await auth.api.getToken({ headers })).token;
    user.session = await auth.api.getSession({ headers });
  }
  const [a, b] = users;
  const payload = decodeJwt(a.token);
  assert.equal(payload.sub, a.id);
  assert.equal(payload.sid, a.session.session.id);
  assert.equal(payload.exp - payload.iat, 300);
  assert.equal((await call("/facilities/mine", a)).status, 200);
  assert.equal((await call("/facilities/mine", a, "GET", undefined, { cookie: "" })).status, 401);
  assert.equal((await call("/facilities/mine", a, "GET", undefined, { authorization: "Bearer bad" })).status, 401);
  const now = Math.floor(Date.now() / 1000);
  for (const overrides of [{ exp: now - 10 }, { aud: "wrong" }, { iss: "https://untrusted.example.test" }, { nbf: now + 3600 }, { sid: "other" }, { sub: b.id }]) {
    const { token } = await auth.api.signJWT({ body: { payload: { ...payload, ...overrides } } });
    assert.equal((await call("/facilities/mine", { ...a, token })).status, 401);
  }
  const pieces = a.token.split(".");
  pieces[2] = (pieces[2][0] === "a" ? "b" : "a") + pieces[2].slice(1);
  assert.equal((await call("/facilities/mine", { ...a, token: pieces.join(".") })).status, 401);
  const hs = await new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode(randomUUID()));
  assert.equal((await call("/facilities/mine", { ...a, token: hs })).status, 401);
  assert.equal((await call("/facilities/mine", { ...b, token: a.token })).status, 401);
  pass("actual frontend BetterAuth EdDSA/JWKS and live session; wrong signature/algorithm/issuer/audience/expiry/session rejected");
  const studio = { name: "Disposable audit studio", category: "Photo", image: ["test-image.jpg"], location: "Dhaka", pricePerHour: 50, capacity: 5, securityDeposit: 0, description: "Disposable verification record" };
  assert.equal((await call("/facilities", a, "POST", { ...studio, capacity: "5" })).status, 400);
  const created = await call("/facilities", a, "POST", { ...studio, ownerId: b.id, email: b.email });
  assert.equal(created.status, 201);
  const id = created.data.insertedId;
  lockIds.push(id);
  const stored = await db.collection("facilities").findOne({ _id: new ObjectId(id) });
  assert.equal(stored.ownerId, a.id);
  assert.equal(stored.email, a.email);
  assert.equal((await call("/facilities/mine", a)).data.length, 1);
  assert.deepEqual((await call("/facilities/my", b)).data, []);
  for (const method of ["PATCH", "PUT", "DELETE"]) {
    assert.equal((await call(`/facilities/${id}`, b, method, method === "DELETE" ? undefined : studio)).status, 403);
  }
  assert.equal((await call(`/facilities/${id}`, a, "PATCH", { image: "test-image.jpg", ownerId: b.id })).status, 200);
  assert.equal((await call(`/facilities/${id}`, a, "PUT", studio)).status, 200);
  assert.equal((await call(`/facilities/${id}`, a, "PUT", { name: "partial" })).status, 400);
  assert.equal((await call(`/facilities/${id}`, a, "PATCH", {})).status, 400);
  assert.equal((await call("/facilities/bad", a, "PATCH", { name: "bad" })).status, 400);
  const bCreated = await call("/facilities", b, "POST", studio);
  assert.equal(bCreated.status, 201);
  const bId = bCreated.data.insertedId;
  lockIds.push(bId);
  assert.equal((await call("/facilities/mine", b)).data[0]._id, bId);
  assert.equal((await call(`/facilities/${bId}`, b, "PATCH", { name: "User B studio" })).status, 200);
  assert.equal((await call(`/facilities/${bId}`, a, "DELETE")).status, 403);
  assert.equal((await call(`/facilities/${bId}`, b, "DELETE")).data.deletedCount, 1);
  pass("facility create/mine/my/PATCH/PUT; trusted owner identity and cross-account 403; string/array images");
  const booking = { facilityId: id, date: "2035-05-10", startTime: "09:00", endTime: "10:00", guests: 3 };
  for (const change of [{ guests: 6 }, { date: "2000-01-01" }, { date: "2035-02-30" }, { startTime: "11:00" }, { endTime: "09:00" }, { guests: 0 }, { guests: 1.5 }, { guests: "2" }, { startTime: "24:00" }, { date: undefined }, { endTime: undefined }, { guests: undefined }]) {
    assert.equal((await call("/facilities/booking", a, "POST", { ...booking, ...change })).status, 400);
  }
  const missingFacility = new ObjectId().toHexString();
  lockIds.push(missingFacility);
  assert.equal((await call("/facilities/booking", a, "POST", { ...booking, facilityId: missingFacility })).status, 404);
  // Two real requests run simultaneously through the shared MongoDB transaction lock.
  const races = await Promise.all([a, b].map((user) => call("/facilities/booking", user, "POST", { ...booking, userId: "forged", email: "forged@example.test" })));
  assert.deepEqual(races.map((r) => r.status).sort(), [201, 409]);
  const winnerIndex = races.findIndex((r) => r.status === 201);
  const winner = users[winnerIndex], loser = users[1 - winnerIndex];
  const bookingId = races[winnerIndex].data.insertedId;
  const saved = (await call(`/facilities/booking/${bookingId}`, winner)).data;
  assert.equal(saved.userId, winner.id);
  assert.equal(saved.email, winner.email);
  assert.equal((await call(`/facilities/booking/${bookingId}`, loser)).status, 403);
  assert.equal((await call(`/facilities/booking/${bookingId}`, loser, "DELETE")).status, 403);
  assert.equal((await call("/facilities/booking", winner)).data.length, 1);
  assert.deepEqual((await call("/facilities/booking", loser)).data, []);
  assert.equal((await call("/facilities/booking/invalid", a)).status, 400);
  assert.equal((await call(`/facilities/booking/${new ObjectId()}`, a)).status, 404);
  const adjacent = await call("/facilities/booking", a, "POST", { ...booking, startTime: "10:00", endTime: "11:00" });
  assert.equal(adjacent.status, 201);
  const nested = await call("/facilities/booking", b, "POST", { ...booking, startTime: "09:15", endTime: "09:45" });
  assert.equal(nested.status, 409);
  assert.equal((await call(`/facilities/${id}`, a, "PATCH", { capacity: 2 })).status, 409);
  assert.equal((await call(`/facilities/${id}`, a, "DELETE")).status, 409);
  pass("booking validation/capacity, concurrent reservation [201,409], adjacency, ownership, capacity/delete guards");
  // Legacy compatibility is tested with newly created fixtures only.
  const legacyId = new ObjectId();
  fixtureBookingIds.push(legacyId);
  await db.collection("facilitiesBooking").insertOne({ _id: legacyId, ...booking, facilityId: id.toUpperCase(), email: a.email, name: a.name, startTime: "12:00", endTime: "13:00" });
  assert.equal((await call("/facilities/booking", a, "POST", { ...booking, startTime: "12:30", endTime: "13:30" })).status, 409);
  assert.equal((await call(`/facilities/booking/${legacyId}`, a)).status, 403);
  // This changes only a disposable test account, never an existing user's record.
  await authDb.collection("user").updateOne({ _id: new ObjectId(a.id) }, { $set: { emailVerified: true } });
  assert.equal((await call(`/facilities/booking/${legacyId}`, a)).status, 200);
  assert.equal((await call(`/facilities/booking/${legacyId}`, a, "DELETE")).status, 200);
  pass("legacy missing-status and uppercase facility ID overlap; email-only ownership requires verified BetterAuth email");
  assert.equal((await call(`/facilities/booking/${bookingId}`, winner, "DELETE")).data.deletedCount, 1);
  assert.equal((await call(`/facilities/booking/${bookingId}`, winner, "DELETE")).status, 404);
  assert.equal((await call(`/facilities/booking/${adjacent.data.insertedId}`, a, "DELETE")).status, 200);
  assert.equal((await call(`/facilities/${id}`, a, "DELETE")).data.deletedCount, 1);
  assert.equal((await call(`/facilities/${id}`)).status, 404);
  pass("owner booking and facility deletion; repeated deletion returns 404");
  const cors = await call("/facilities", null, "GET", undefined, { origin: issuer });
  assert.equal(cors.headers.get("access-control-allow-origin"), issuer);
  assert.equal(cors.headers.get("access-control-allow-credentials"), "true");
  assert.equal((await call("/facilities", null, "GET", undefined, { origin: "https://untrusted.example.test" })).status, 403);
  const preflight = await fetch(`${api}/facilities`, { method: "OPTIONS", headers: { origin: issuer, "access-control-request-method": "POST", "access-control-request-headers": "authorization,content-type" } });
  assert.equal(preflight.status, 204);
  const malformed = await fetch(`${api}/facilities`, { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).message, "Malformed JSON body.");
  const large = await fetch(`${api}/facilities`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: "x".repeat(110000) }) });
  assert.equal(large.status, 413);
  pass("exact CORS allow/reject/preflight, malformed JSON, payload size, consistent JSON errors");
  await request(issuer, "/api/auth/sign-out", a, "POST", {}, { origin: issuer });
  assert.equal((await call("/facilities/mine", a)).status, 401);
  pass("logout immediately revokes access despite unexpired JWT");
  // Execute the real entry point as a CLI, on a free port, with the current
  // local .env/database. This separately exercises its startup-only branch.
  await childCheck(`
    import { createServer } from "node:http";
    import { spawn } from "node:child_process";
    import assert from "node:assert/strict";
    const probe = createServer();
    await new Promise(done => probe.listen(0, "127.0.0.1", done));
    const port = probe.address().port;
    await new Promise(done => probe.close(done));
    const env = { ...process.env, PORT: String(port) };
    delete env.VERCEL;
    const child = spawn(process.execPath, ["index.js"], { env, stdio: ["ignore", "pipe", "pipe"] });
    try {
      await new Promise((done, reject) => {
        child.once("exit", () => reject(new Error("CLI exited before listening")));
        child.stdout.on("data", chunk => { if (chunk.toString().includes("listening")) done(); });
      });
      const r = await fetch("http://127.0.0.1:" + port + "/health");
      assert.equal(r.status, 200);
      assert.equal((await r.json()).database, "connected");
    } finally {
      child.kill("SIGTERM");
      await new Promise(done => child.once("exit", done));
    }
  `);
  pass("actual node index.js startup checks MongoDB and serves health over HTTP");
  await childCheck(`
    import assert from "node:assert/strict";
    const { default: app } = await import("./index.js");
    const { client } = await import("./database.js");
    const server = app.listen(0, "127.0.0.1");
    await new Promise(done => server.once("listening", done));
    try {
      const r = await fetch("http://127.0.0.1:" + server.address().port + "/health");
      assert.equal(r.status, 503);
      assert.deepEqual(await r.json(), { message: "Database operation is temporarily unavailable." });
    } finally {
      await new Promise(done => server.close(done));
      await client.close();
    }
  `, { MONGODB_URI: "mongodb://127.0.0.1:1/unreachable", VERCEL: "1" });
  pass("unavailable MongoDB returns a sanitized JSON 503 without an import crash");
} finally {
  for (const child of childProcesses) if (child.exitCode === null) child.kill("SIGTERM");
  if (apiServer) await new Promise((done) => apiServer.close(done));
  if (authServer) await new Promise((done) => authServer.close(done));
  if (db) {
    const ids = users.map((u) => u.id);
    await db.collection("facilitiesBooking").deleteMany({ $or: [{ userId: { $in: ids } }, { _id: { $in: fixtureBookingIds } }] });
    await db.collection("facilities").deleteMany({ ownerId: { $in: ids } });
    await db.collection("bookingLocks").deleteMany({ _id: { $in: lockIds } });
    for (const { name, docs } of snapshots || []) {
      const after = await db.collection(name).find({ _id: { $in: docs.map((doc) => doc._id) } }).sort({ _id: 1 }).toArray();
      assert.equal(digest(after), digest(docs), `Original ${name} documents must remain unchanged`);
    }
    console.log("Original facility and booking document hashes unchanged.");
  }
  if (authDb) {
    const createdUsers = await authDb.collection("user").find({ email: { $in: emails } }).toArray();
    const ids = createdUsers.flatMap((u) => [u._id, String(u._id)]);
    await authDb.collection("session").deleteMany({ userId: { $in: ids } });
    await authDb.collection("account").deleteMany({ userId: { $in: ids } });
    await authDb.collection("user").deleteMany({ email: { $in: emails } });
    // Signing keys are managed by BetterAuth and deliberately retained.
    if (!originalJwks?.length) console.log("BetterAuth initialized public signing key storage; managed signing keys retained.");
  }
  await Promise.all([dbClient.close(), authClient.close(), backendClient?.close()]);
  console.log(`Finished ${checks} integration check groups; disposable users/resources cleaned up.`);
}
// The frontend owns an unexposed MongoClient; all cleanup above completes first.
process.exit(0);
