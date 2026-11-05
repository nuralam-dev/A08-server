// Runs the real auth configuration against an isolated memory adapter: no MongoDB access.
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS loader substitutes only the database adapter in this isolated test. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { memoryAdapter } = require("@better-auth/memory-adapter");

const canonical = "https://studiospace-client-topaz.vercel.app";
const deployment = "https://studiospace-client-icm9qam2d-nur-alam1.vercel.app";
const environment = {
  NODE_ENV: "production",
  BETTER_AUTH_URL: canonical,
  AUTH_TRUSTED_ORIGINS: deployment,
  BETTER_AUTH_SECRET: "isolated-test-secret-with-at-least-32-characters",
  MONGODB_URI: "mongodb://unused.invalid/test",
  API_AUTH_MODE: "jwt",
  JWT_AUDIENCE: "studiospace-api",
};
const database = { user: [], account: [], session: [], verification: [], jwks: [] };
const cache = new Map();
function load(relative) {
  const filename = path.resolve(relative);
  if (cache.has(filename)) return cache.get(filename);
  const exports = {};
  cache.set(filename, exports);
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, process: { env: environment }, console, URL, Request, Response, Headers, AbortSignal,
    require(name) {
      if (name === "server-only") return {};
      if (name.startsWith("@/")) return load(`src/${name.slice(2)}.ts`);
      if (name === "./lib/auth") return load("src/lib/auth.ts");
      if (name === "mongodb") return { MongoClient: class { db() { return {}; } } };
      if (name === "@better-auth/mongo-adapter") return { mongodbAdapter: () => memoryAdapter(database) };
      return require(name);
    },
  }, { filename });
  return exports;
}

async function main() {
  const { getAuthOrigins } = load("src/lib/auth-origins.ts");
  assert.deepEqual(Array.from(getAuthOrigins().trustedOrigins), [canonical, deployment]);
  for (const invalid of ["https://*.vercel.app", "http://localhost:3000", "https://example.com/api", "https://user:pass@example.com"]) {
    environment.AUTH_TRUSTED_ORIGINS = invalid;
    assert.throws(getAuthOrigins);
  }
  environment.AUTH_TRUSTED_ORIGINS = deployment;
  environment.NEXT_PUBLIC_AUTH_URL = "https://old.example.com";
  assert.throws(getAuthOrigins, /must use the same/);
  delete environment.NEXT_PUBLIC_AUTH_URL;
  environment.NODE_ENV = "development";
  delete environment.BETTER_AUTH_URL;
  delete environment.AUTH_TRUSTED_ORIGINS;
  assert.deepEqual(Array.from(getAuthOrigins().trustedOrigins), ["http://localhost:3000"]);
  environment.NODE_ENV = "production";
  assert.throws(getAuthOrigins, /canonical HTTPS/);
  environment.BETTER_AUTH_URL = canonical;
  environment.AUTH_TRUSTED_ORIGINS = deployment;

  const { auth } = load("src/lib/auth.ts").getAuth();
  const payload = { name: "Isolated Test", email: "isolated@example.test", password: "TestPassword123!" };
  const post = (endpoint, origin, body, cookie) => auth.handler(new Request(`${deployment}/api/auth/${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin, "sec-fetch-site": "same-origin", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  }));
  const denied = await post("sign-up/email", "https://untrusted.example.com", payload);
  assert.equal(denied.status, 403);
  const signup = await post("sign-up/email", deployment, payload);
  assert.equal(signup.status, 200, await signup.clone().text());
  const setCookies = signup.headers.getSetCookie();
  assert(setCookies.some((cookie) => /session_token/.test(cookie) && /HttpOnly/i.test(cookie) && /Secure/i.test(cookie) && /SameSite=Lax/i.test(cookie)));
  const cookie = setCookies.map((value) => value.split(";")[0]).join("; ");
  const session = await auth.api.getSession({ headers: new Headers({ cookie }), query: { disableCookieCache: true } });
  assert.equal(session.user.email, payload.email);
  const signin = await post("sign-in/email", canonical, { email: payload.email, password: payload.password });
  assert.equal(signin.status, 200);
  const { token } = await auth.api.getToken({ headers: new Headers({ cookie }) });
  const jwksResponse = await auth.handler(new Request(`${canonical}/api/auth/jwks`));
  assert.equal(jwksResponse.status, 200);
  const { jwtVerify, createLocalJWKSet } = require("jose");
  const verified = await jwtVerify(token, createLocalJWKSet(await jwksResponse.json()), { issuer: canonical, audience: "studiospace-api" });
  assert.equal(verified.payload.sub, session.user.id);
  assert.equal(verified.payload.sid, session.session.id);
  assert.equal((await auth.handler(new Request(`${canonical}/api/auth/token`, { headers: { cookie } }))).status, 404);

  const { NextRequest } = require("next/server");
  const { proxy } = load("src/proxy.ts");
  const anonymous = await proxy(new NextRequest(`${deployment}/dashboard/add-facility`));
  assert.equal(anonymous.status, 307);
  assert.match(anonymous.headers.get("location"), /\/login\?next=/);
  const signedIn = await proxy(new NextRequest(`${deployment}/dashboard/add-facility`, { headers: { cookie } }));
  assert.equal(signedIn.headers.get("x-middleware-next"), "1");
  environment.API_AUTH_MODE = "session";
  cache.delete(path.resolve("src/lib/auth.ts"));
  const sessionAuth = load("src/lib/auth.ts").getAuth();
  assert.equal(sessionAuth.jwtEnabled, false);
  const sessionSignin = await sessionAuth.auth.handler(new Request(`${deployment}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: deployment, "sec-fetch-site": "same-origin" },
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  }));
  assert.equal(sessionSignin.status, 200);
  const sessionCookie = sessionSignin.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  assert.equal((await sessionAuth.auth.api.getSession({ headers: new Headers({ cookie: sessionCookie }) })).user.email, payload.email);
  console.log("PASS: exact origins; production/local separation; untrusted signup blocked; signup/signin in session and JWT modes; secure HTTP-only session; dashboard protection; verified JWT issuer/audience/session claims; browser token endpoint disabled. No MongoDB connection was made.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
