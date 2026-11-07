import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, URL, process: { env: {} }, require: name => { if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`); return dependencies[name]; } });
  return exports;
}
const model = load("../src/features/billing/model.ts");
const { createStoreSession } = load("../src/features/billing/store-session.ts");
const active = { configured: true, entitlement: { ...model.FREE_ENTITLEMENT, tier: "pro", active: true, source: "revenuecat" } };
const free = { configured: true, entitlement: model.FREE_ENTITLEMENT };
function mockSdk() {
  let user = null; const calls = [];
  return { calls, configure: ({ appUserID }) => { user = appUserID; calls.push(["configure", user]); }, getAppUserID: async () => user, logIn: async id => { user = id; calls.push(["login", id]); }, logOut: async () => { calls.push(["logout", user]); user = "anonymous"; } };
}
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

test("only an active server-confirmed Pro entitlement unlocks access", () => {
  assert.equal(model.hasPro(null), false);
  assert.equal(model.hasPro(free), false);
  assert.equal(model.hasPro({ ...active, entitlement: { ...active.entitlement, active: false } }), false);
  assert.equal(model.hasPro({ ...active, entitlement: { ...active.entitlement, tier: "free" } }), false);
  assert.equal(model.hasPro(active), true);
});
test("a completed store purchase remains pending when server sync is offline or delayed", async () => {
  assert.equal(await model.confirmStorePurchase(async () => { throw new Error("offline"); }), "pending");
  assert.equal(await model.confirmStorePurchase(async () => free), "pending");
  assert.equal(await model.confirmStorePurchase(async () => active), "active");
});
test("SDK operations are account-bound and identity switches wait for a purchase to finish", async () => {
  const sdk = mockSdk(); const session = createStoreSession(() => sdk, () => "public-key");
  await session.identify("alice");
  const entered = deferred(); const finish = deferred();
  const purchase = session.withUser("alice", async client => { assert.equal(await client.getAppUserID(), "alice"); entered.resolve(); await finish.promise; return "receipt"; });
  await entered.promise;
  const switchAccount = session.identify("bob");
  assert.equal(session.currentUser, null);
  finish.resolve();
  await assert.rejects(purchase, /account changed/);
  await switchAccount;
  assert.equal(session.currentUser, "bob");
  await assert.rejects(session.withUser("alice", async () => "wrong"), /account changed/);
  assert.deepEqual(sdk.calls, [["configure", "alice"], ["login", "bob"]]);
});
test("failed logout clears local authorization and the next account is explicitly identified", async () => {
  const sdk = mockSdk(); const session = createStoreSession(() => sdk, () => "public-key");
  await session.identify("alice");
  sdk.logOut = async () => { throw new Error("offline"); };
  await assert.rejects(session.identify(null), /offline/);
  assert.equal(session.currentUser, null);
  await assert.rejects(session.withUser("alice", async () => null), /account changed/);
  await session.identify("bob");
  assert.equal(await sdk.getAppUserID(), "bob");
});
test("missing billing config never loads the native SDK or starts a transaction", async () => {
  let imports = 0;
  const session = createStoreSession(() => { imports++; return mockSdk(); }, () => null);
  await assert.rejects(session.identify("alice"), /not available/);
  await assert.rejects(session.withUser("alice", async () => "purchase"), /not available/);
  assert.equal(imports, 0);
});
test("an old binary and web return a useful error without importing RevenueCat", () => {
  for (const os of ["android", "web"]) {
    const native = load("../src/features/billing/native.ts", { "react-native": { NativeModules: {}, Platform: { OS: os } }, "./store-session": { createStoreSession: () => ({}) } });
    assert.throws(() => native.loadPurchases(), os === "android" ? /latest FitSync build/ : /iOS or Android/);
  }
});
test("legal and management links require HTTPS and have real store fallbacks", () => {
  assert.equal(model.legalUrl("javascript:alert(1)"), null);
  assert.equal(model.legalUrl("http://example.test/terms"), null);
  assert.equal(model.legalUrl("https://example.test/terms"), "https://example.test/terms");
  assert.equal(model.subscriptionManagementUrl("javascript:alert(1)", "ios"), "https://apps.apple.com/account/subscriptions");
  assert.equal(model.subscriptionManagementUrl(null, "android"), "https://play.google.com/store/account/subscriptions");
});

test("an expired response cannot keep local Pro controls enabled", () => {
  const expiresAt = "2026-11-07T12:00:00Z";
  const status = { ...active, entitlement: { ...active.entitlement, expiresAt } };
  assert.equal(model.hasPro(status, Date.parse("2026-11-07T11:59:59Z")), true);
  assert.equal(model.hasPro(status, Date.parse(expiresAt)), false);
  assert.equal(model.hasPro({ ...status, entitlement: { ...status.entitlement, expiresAt: "invalid" } }), false);
});
test("Android terms use the real recurring price and include all introductory phases", () => {
  const { makeOffers } = load("../src/features/billing/offers.ts", { "./model": model });
  const phase = (amount, formatted, period, value, unit, cycles) => ({ price: { amountMicros: amount, formatted }, billingPeriod: { iso8601: period, value, unit }, billingCycleCount: cycles });
  const regular = phase(299000000, "₹299.00", "P1M", 1, "MONTH", null);
  const product = { subscriptionPeriod: "P1M", title: "FitSync Pro", priceString: "₹0.00", introPrice: null, installmentsInfo: null, defaultOption: { fullPricePhase: regular, pricingPhases: [phase(0, "₹0.00", "P7D", 7, "DAY", 1), phase(99000000, "₹99.00", "P1M", 1, "MONTH", 3), regular], isPrepaid: false, installmentsInfo: null } };
  const offer = makeOffers([{ identifier: "monthly", product }], "android")[0];
  assert.equal(offer.price, "₹299.00"); assert.equal(offer.period, "month");
  assert.match(offer.intro, /Free for 7 days/); assert.match(offer.intro, /₹99.00 for 1 month × 3/);
  assert.equal(makeOffers([{ identifier: "prepaid", product: { ...product, defaultOption: { ...product.defaultOption, isPrepaid: true } } }], "android").length, 0);
});
