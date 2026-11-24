import * as weightUnits from "../src/lib/weight.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { presentPlans, selectedPlan } from "../src/features/billing/plan-presentation.ts";
import { makeOffers } from "../src/features/billing/offers.ts";
import {
  PRO_BENEFITS,
  PRO_COMPARISON,
  PRO_FAQS,
} from "../src/features/billing/pro-marketing-content.ts";
import { legalUrl } from "../src/features/billing/model.ts";

function offer(id, period, price, currency = "INR", extra = {}) {
  return {
    id,
    title: "FitSync Pro",
    price: `${currency} ${price}`,
    period: period === "P1M" ? "month" : "year",
    intro: null,
    package: { product: { price, currencyCode: currency, subscriptionPeriod: period, ...extra } },
  };
}
const monthly = () => offer("monthly", "P1M", 300);
const yearly = () => offer("yearly", "P1Y", 2400);
const lifetime = () =>
  makeOffers(
    [
      {
        identifier: "lifetime",
        packageType: "LIFETIME",
        product: {
          subscriptionPeriod: null,
          productCategory: "NON_SUBSCRIPTION",
          productType: "NON_CONSUMABLE",
          title: "FitSync Pro",
          priceString: "INR 5900",
          price: 5900,
          currencyCode: "INR",
        },
      },
    ],
    "android",
  )[0];

test("a configured Lifetime package is retained and presented as a one-time purchase", () => {
  const plans = presentPlans([lifetime(), yearly(), monthly()], "android");
  assert.deepEqual(
    plans.map((plan) => plan.title),
    ["Monthly", "Yearly", "Lifetime"],
  );
  assert.equal(plans[2].oneTime, true);
  assert.equal(plans[2].cadence, "Pay once");
  assert.equal(plans[2].savings, null);
  assert.equal(plans[2].offer.price, "INR 5900");
  const product = lifetime().package;
  assert.equal(
    makeOffers(
      [{ ...product, product: { ...product.product, productType: "CONSUMABLE" } }],
      "android",
    ).length,
    0,
  );
  assert.equal(makeOffers([{ ...product, packageType: "CUSTOM" }], "android").length, 0);
});

test("the annual default and savings use the real recurring store prices", () => {
  const plans = presentPlans([yearly(), monthly()], "ios");
  assert.deepEqual(
    plans.map((plan) => plan.title),
    ["Monthly", "Yearly"],
  );
  assert.equal(plans[1].savings, 33);
  assert.match(plans[1].monthlyEquivalent, /200/);
  assert.equal(plans[0].monthlyEquivalent, null);
  assert.equal(selectedPlan(plans, null).offer.id, "yearly");
  assert.equal(selectedPlan(plans, "monthly").offer.id, "monthly");
  assert.equal(selectedPlan([], "removed"), null);
});
test("savings never mix currencies, invent a monthly comparator or use introductory prices", () => {
  assert.equal(presentPlans([yearly()], "ios")[0].savings, null);
  assert.equal(
    presentPlans([monthly(), offer("yearly", "P1Y", 100, "USD")], "ios")[1].savings,
    null,
  );
  assert.equal(presentPlans([monthly(), offer("yearly", "P1Y", 5000)], "ios")[1].savings, null);
  const phase = (amount, period) => ({
    price: { amountMicros: amount * 1e6, currencyCode: "INR" },
    billingPeriod: { iso8601: period },
  });
  const plans = presentPlans(
    [
      offer("monthly", "P1M", 0, "INR", { defaultOption: { fullPricePhase: phase(300, "P1M") } }),
      offer("yearly", "P1Y", 0, "INR", { defaultOption: { fullPricePhase: phase(2400, "P1Y") } }),
    ],
    "android",
  );
  assert.equal(plans[1].savings, 33);
});
test("removing the selected plan falls back to an available plan and does not fabricate lifetime", () => {
  const plans = presentPlans([monthly()], "ios");
  assert.equal(selectedPlan(plans, "yearly").offer.id, "monthly");
  assert.equal(
    plans.some((plan) => /lifetime/i.test(plan.title)),
    false,
  );
  assert.equal(PRO_COMPARISON.find((row) => row.feature === "Graph history").free, "90 days");
  assert.equal(PRO_COMPARISON.find((row) => row.feature === "Workout logging").free, "Unlimited");
  assert.equal(PRO_COMPARISON.find((row) => row.feature === "Create custom exercises").free, false);
  assert.equal(PRO_COMPARISON.find((row) => row.feature === "Saved routines").free, true);
});

function fixture(options = {}) {
  const slots = [];
  let cursor = 0;
  const calls = [];
  const dimensions = { width: 390, height: 844, fontScale: 1 };
  const billing = {
    isPro: false,
    loading: false,
    busy: false,
    configured: true,
    storeReady: true,
    pendingActivation: false,
    error: null,
    storeError: null,
    offers: [monthly(), yearly()],
    entitlement: { expiresAt: null, willRenew: false },
    refresh: async () => {
      calls.push(["refresh"]);
    },
    purchase: async (id) => {
      calls.push(["purchase", id]);
      return "cancelled";
    },
    restore: async () => {
      calls.push(["restore"]);
      return "none";
    },
    manage: async () => {
      calls.push(["manage"]);
    },
  };
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react: {
      useEffect() {},
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
        return [
          slots[index],
          (value) => {
            slots[index] = typeof value === "function" ? value(slots[index]) : value;
          },
        ];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = { current: initial };
        return slots[index];
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": {
      ActivityIndicator: "Loading",
      Linking: { openURL: async (url) => calls.push(["link", url]) },
      Platform: { OS: "ios" },
      RefreshControl: "Refresh",
      ScrollView: "Scroll",
      View: "View",
      useWindowDimensions: () => dimensions,
    },
    "expo-router": {
      useLocalSearchParams: () => ({ source: options.source ?? "pro_tab" }),
      router: {
        canGoBack: () => true,
        back: () => calls.push(["back"]),
        replace: (route) => calls.push(["replace", route]),
        push: (route) => calls.push(["push", route]),
      },
    },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 20 }) },
    "@expo/vector-icons": { MaterialCommunityIcons: "Icon" },
    "@/src/components/motion": { MotionPressable: "Pressable", ScreenEntrance: "Screen" },
    "@/src/components/ui": { Txt: "Text" },
    "@/src/context/session": { useSession: () => ({ user: { id: "owner" } }) },
    "@/src/constants/theme": { C: { brand: "#C5F460", ink: "#FFFFFF", bg: "#000000" } },
    "./billing-context": { useBilling: () => billing },
    "./native": { revenueCatKey: () => options.sdkKey ?? "goog_fixture" },
    "./model": { legalUrl },
    "./plan-presentation": { presentPlans, selectedPlan },
    "./pro-feature-art": { ProFeatureArt: "Art" },
    "./pro-marketing-content": { PRO_BENEFITS, PRO_COMPARISON, PRO_FAQS },
    "./personal-preview": { PaywallEvidence: () => null },
    "./trial-reminders": {
      requestTrialReminderPermission: async () => options.notifications ?? true,
    },
  };
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL("../src/features/billing/paywall.tsx", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  vm.runInNewContext(code, {
    exports,
    __DEV__: options.development ?? false,
    Date,
    Intl,
    Promise,
    process: {
      env: options.noLegal
        ? {}
        : {
            EXPO_PUBLIC_TERMS_URL: "https://fitsync.test/terms",
            EXPO_PUBLIC_PRIVACY_URL: "https://fitsync.test/privacy",
          },
    },
    require: (name) => {
      if (name === "@/src/lib/weight") return weightUnits;
      if (name === "@/src/services/telemetry" || name === "./telemetry")
        return { trackEvent() {}, recordError() {} };
      if (name === "@/src/components/health-disclaimer") return { HealthDisclaimer: () => null };

      if (!(name in dependencies)) throw Error(name);
      return dependencies[name];
    },
  });
  function expand(node) {
    if (!node || typeof node !== "object") return node;
    if (Array.isArray(node)) return node.map(expand);
    if (typeof node.type === "function") return expand(node.type(node.props));
    return { ...node, props: { ...node.props, children: expand(node.props?.children) } };
  }
  return {
    billing,
    calls,
    dimensions,
    render() {
      cursor = 0;
      return expand(exports.ProScreen({ embedded: options.embedded ?? true }));
    },
  };
}
function find(node, type) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap((item) => find(item, type));
  return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
}
function text(node) {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(text).join(" ");
  return typeof node === "object" ? text(node.props?.children) : String(node);
}
const button = (tree, label) => find(tree, "Pressable").find((node) => text(node).includes(label));
const tick = () => new Promise(setImmediate);

test("Lifetime selection buys its store package with no automatic renewal wording", async () => {
  const f = fixture();
  f.billing.offers = [monthly(), yearly(), lifetime()];
  let tree = f.render();
  find(tree, "Pressable")
    .find((node) => node.props.accessibilityLabel?.startsWith("Lifetime,"))
    .props.onPress();
  tree = f.render();
  assert.match(text(tree), /Pay once\. No automatic renewal/);
  assert.match(text(tree), /Lifetime Pro is a one-time purchase of INR 5900/);
  assert.doesNotMatch(text(tree), /Your subscription renews automatically at/);
  button(tree, "Get lifetime Pro").props.onPress();
  await tick();
  assert.deepEqual(f.calls, [["purchase", "lifetime"]]);
});

test("plan selection purchases the selected store package, and rapid taps cannot duplicate checkout", async () => {
  const f = fixture();
  let resolve;
  f.billing.purchase = async (id) => {
    f.calls.push(["purchase", id]);
    return new Promise((done) => {
      resolve = done;
    });
  };
  let tree = f.render();
  assert.equal(
    find(tree, "Pressable")
      .filter(
        (node) => node.props.accessibilityRole === "radio" && node.props.accessibilityState.checked,
      )[0]
      .props.accessibilityLabel.startsWith("Yearly"),
    true,
  );
  find(tree, "Pressable")
    .find((node) => node.props.accessibilityLabel?.startsWith("Monthly,"))
    .props.onPress();
  tree = f.render();
  const buy = button(tree, "Continue with monthly");
  buy.props.onPress();
  buy.props.onPress();
  assert.deepEqual(f.calls, [["purchase", "monthly"]]);
  resolve("cancelled");
  await tick();
  assert.match(text(f.render()), /Continue with monthly/);
});
test("pending, missing legal terms and failed membership verification cannot start a second purchase", async () => {
  for (const state of ["pending", "legal", "error", "loading", "unavailable"]) {
    const f = fixture({ noLegal: state === "legal" });
    if (state === "pending") f.billing.pendingActivation = true;
    if (state === "error") f.billing.error = "offline";
    if (state === "loading") f.billing.loading = true;
    if (state === "unavailable") {
      f.billing.offers = [];
      f.billing.storeReady = false;
    }
    const tree = f.render();
    const primary = find(tree, "Pressable").find((node) =>
      node.props.className?.includes("min-h-14"),
    );
    if (!primary.props.disabled) primary.props.onPress();
    await tick();
    assert.equal(
      f.calls.some((call) => call[0] === "purchase"),
      false,
      state,
    );
  }
});
test("unavailable plans show the actual store failure and allow retrying", async () => {
  for (const offers of [[], [monthly()]]) {
    const f = fixture();
    f.billing.offers = offers;
    f.billing.storeReady = false;
    f.billing.storeError = "Subscriptions are not available in this build yet.";
    const tree = f.render();
    assert.match(text(tree), /Subscriptions are not available in this build yet/);
    button(tree, "Refresh plans").props.onPress();
    await tick();
    assert.deepEqual(f.calls, [["refresh"]]);
  }
});
test("loaded plans do not offer an ineffective refresh when checkout setup is missing", async () => {
  for (const reason of ["server", "legal", "both"]) {
    const f = fixture({ noLegal: reason !== "server" });
    if (reason !== "legal") f.billing.configured = false;
    const tree = f.render();
    const primary = button(tree, "Checkout unavailable");
    assert.equal(primary.props.disabled, true);
    assert.match(text(tree), /Your plans are loaded, but checkout is not available yet/);
    assert.equal(
      find(tree, "Pressable").some((node) => text(node) === "Refresh plans"),
      false,
    );
    primary.props.onPress();
    await tick();
    assert.deepEqual(f.calls, []);
  }
});
test("a membership lookup failure retries verification rather than asking to reload prices", async () => {
  const f = fixture();
  f.billing.error = "Could not verify subscription status.";
  const tree = f.render();
  button(tree, "Retry membership check").props.onPress();
  await tick();
  assert.deepEqual(f.calls, [["refresh"]]);
});
test("debug Test Store checkout works without deployed legal pages and still requires server verification", async () => {
  const f = fixture({ noLegal: true, development: true, sdkKey: "test_fixture" });
  let tree = f.render();
  assert.match(text(tree), /Test checkout · No real charges/);
  const checkout = button(tree, "Continue with yearly");
  assert.equal(checkout.props.disabled, false);
  checkout.props.onPress();
  await tick();
  assert.deepEqual(f.calls, [["purchase", "yearly"]]);
  f.billing.configured = false;
  tree = f.render();
  assert.equal(button(tree, "Checkout unavailable").props.disabled, true);
  f.billing.configured = true;
  f.billing.error = "Verification unavailable";
  button(f.render(), "Retry membership check").props.onPress();
  await tick();
  assert.deepEqual(f.calls, [["purchase", "yearly"], ["refresh"]]);
});
test("real-store development and all release checkout still require published legal pages", () => {
  for (const settings of [
    { development: true, sdkKey: "goog_fixture" },
    { development: false, sdkKey: "test_fixture" },
    { development: false, sdkKey: "goog_fixture" },
  ]) {
    const f = fixture({ noLegal: true, ...settings });
    const tree = f.render();
    assert.equal(button(tree, "Checkout unavailable").props.disabled, true);
    assert.doesNotMatch(text(tree), /Test checkout · No real charges/);
  }
});
test("the FAQs expand accessibly and the last content stays clear of the measured purchase dock", () => {
  const f = fixture();
  let tree = f.render();
  const question = button(tree, "How are training recommendations made?");
  assert.equal(question.props.accessibilityState.expanded, false);
  question.props.onPress();
  tree = f.render();
  assert.match(text(tree), /not provided by a human trainer/);
  assert.equal(
    button(tree, "How are training recommendations made?").props.accessibilityState.expanded,
    true,
  );
  const dock = find(tree, "View").find((node) => node.props.onLayout);
  dock.props.onLayout({ nativeEvent: { layout: { height: 370 } } });
  tree = f.render();
  assert.equal(
    find(tree, "Scroll").find((node) => !node.props.horizontal).props.contentContainerStyle
      .paddingBottom,
    394,
  );
  f.dimensions.height = 580;
  tree = f.render();
  assert.equal(
    find(tree, "View").some((node) => node.props.className?.includes("absolute inset-x-0")),
    false,
  );
  f.dimensions.height = 844;
  f.dimensions.fontScale = 1.5;
  assert.equal(
    find(f.render(), "View").some((node) => node.props.className?.includes("absolute inset-x-0")),
    false,
  );
});
test("restoring an empty store account reports the result and Not now returns home", async () => {
  const f = fixture();
  button(f.render(), "Restore purchases").props.onPress();
  await tick();
  assert.match(text(f.render()), /No active purchase was found/);
  button(f.render(), "Not now").props.onPress();
  assert.deepEqual(f.calls.at(-1), ["replace", "/(tabs)"]);
  assert.equal(
    f.calls.some((call) => call[0] === "purchase"),
    false,
  );
});

test("the paywall leads with an outcome, three concise benefits and transparent yearly terms", () => {
  const f = fixture();
  const tree = f.render();
  const copy = text(tree);
  assert.match(copy, /Know exactly what to lift next session/);
  assert.match(copy, /logging stays free forever/);
  assert.match(copy, /200.*month equivalent/);
  assert.match(copy, /INR 2400.*Billed yearly/);
  const everything = copy.indexOf("Everything included in Pro");
  for (const benefit of [
    "Go in with your next working-set targets",
    "Move a missed session with one confirmation",
    "Know what your week’s training tells you",
  ])
    assert.ok(copy.indexOf(benefit) < everything);
  assert.ok(find(tree, "Pressable").some((node) => text(node) === "Restore"));
  assert.ok(
    find(tree, "Pressable").some((node) => node.props.accessibilityLabel === "Close Pro page"),
  );
  assert.doesNotMatch(copy, /Start my 7-day free trial|Day 7:/);
});
test("an eligible trial has a truthful timeline and an explicit permission-backed reminder option", async () => {
  for (const notifications of [true, false]) {
    const f = fixture({ notifications, source: "personal_best" });
    f.billing.offers = [{ ...yearly(), trialDays: 7 }];
    f.billing.purchase = async (...args) => {
      f.calls.push(args);
      return "cancelled";
    };
    let tree = f.render();
    assert.match(
      text(tree),
      /Today: full Pro access.*Day 5:\s+optional device reminder.*Day 7:\s+INR 2400/,
    );
    const option = find(tree, "Pressable").find(
      (node) => node.props.accessibilityRole === "checkbox",
    );
    assert.equal(option.props.accessibilityState.checked, false);
    option.props.onPress();
    await tick();
    tree = f.render();
    assert.equal(
      find(tree, "Pressable").find((node) => node.props.accessibilityRole === "checkbox").props
        .accessibilityState.checked,
      notifications,
    );
    if (!notifications) assert.match(text(tree), /Notifications are off/);
    button(tree, "Start my 7-day free trial").props.onPress();
    await tick();
    assert.equal(f.calls[0][0], "yearly");
    assert.equal(f.calls[0][1].trialReminder, notifications);
  }
});
test("small screens show checkout before the extended feature list", () => {
  const f = fixture();
  f.dimensions.height = 580;
  const copy = text(f.render());
  assert.ok(copy.indexOf("Continue with yearly") < copy.indexOf("Everything included in Pro"));
});
