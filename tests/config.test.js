import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const clean = { PATH: process.env.PATH, DOTENV_CONFIG_PATH: "/dev/null", MONGODB_URI: "mongodb://127.0.0.1:27017/test" };
function config(values) {
  return spawnSync(process.execPath, ["--input-type=module", "-e", 'const c=await import("./config.js");console.log(JSON.stringify({client:c.clientOrigin,auth:c.authBaseUrl,issuer:c.jwtIssuer,jwks:c.jwksUrl,audience:c.jwtAudience}))'], { cwd: new URL("..", import.meta.url), env: { ...clean, ...values }, encoding: "utf8" });
}
test("local defaults and exact HTTPS production configuration", () => {
  const local = config({});
  assert.equal(local.status, 0);
  assert.equal(JSON.parse(local.stdout).client, "http://localhost:3000");
  const production = config({ NODE_ENV: "production", CLIENT_URL: "https://frontend.example.test", JWT_AUDIENCE: "studiospace-api" });
  assert.equal(production.status, 0);
  assert.equal(JSON.parse(production.stdout).jwks, "https://frontend.example.test/api/auth/jwks");
});
test("production rejects missing origins, HTTP/local origins, wildcards, conflicts and missing audience", () => {
  const base = { NODE_ENV: "production", JWT_AUDIENCE: "studiospace-api" };
  for (const CLIENT_URL of ["", "http://frontend.example.test", "https://localhost", "https://frontend.example.test/path", "https://*.example.test", "https://user:pass@frontend.example.test"]) {
    assert.notEqual(config({ ...base, CLIENT_URL }).status, 0);
  }
  assert.notEqual(config({ ...base, CLIENT_URL: "https://frontend.example.test", CLIENT_ORIGIN: "https://other.example.test" }).status, 0);
  assert.notEqual(config({ NODE_ENV: "production", CLIENT_URL: "https://frontend.example.test" }).status, 0);
  assert.notEqual(config({ PORT: "invalid" }).status, 0);
  assert.notEqual(config({ API_AUTH_MODE: "session" }).status, 0);
});
