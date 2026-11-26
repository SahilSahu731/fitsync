import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadTypeScript } from "./load-typescript.mjs";

function page(path, { isAdmin = false, signedIn = true } = {}) {
  const { Workspace } = loadTypeScript("../src/components/shell.tsx", {
    "next/link": { default: "a" },
    "next/navigation": { usePathname: () => path },
    "./session": {
      useSession: () => ({ account: signedIn ? { user: { name: "Sam" } } : null, admin: isAdmin }),
      AccessGate: () => "Access check",
    },
    "./icon": { Icon: () => null },
    "./site/brand": { Brand: () => null, AccountAvatar: () => null, focusRing: "" },
    "./site/site-header": { SiteHeader: () => null },
    "./site/site-footer": { SiteFooter: () => null },
  });
  return renderToStaticMarkup(
    createElement(Workspace, { admin: path.startsWith("/admin") }, "Requested page"),
  );
}

test("members see the launch notice when landing on account home or visiting the planner directly", () => {
  for (const path of ["/user/home", "/user/planner"]) {
    const html = page(path);
    assert.match(html, /web workspace is in development/);
    assert.match(html, /href="\/user\/settings"/);
    assert.doesNotMatch(html, /Requested page|href="\/user\/planner"/);
  }
});

test("members can access their profile and account settings", () => {
  for (const path of ["/user/profile", "/user/settings"]) {
    assert.match(page(path), /Requested page/);
    assert.match(page(path, { signedIn: false }), /Access check/);
  }
});

test("only administrators see admin controls and retain access to the planner", () => {
  assert.match(page("/admin", { isAdmin: true }), /Requested page/);
  assert.match(page("/user/planner", { isAdmin: true }), /Requested page/);
  for (const options of [{}, { signedIn: false }]) {
    const html = page("/admin", options);
    assert.match(html, /Access check/);
    assert.doesNotMatch(html, /Admin navigation|Requested page/);
  }
});

test("signed-in users can resume account deletion or open the correct role's home", () => {
  function login(admin, returnTo) {
    const { Login } = loadTypeScript(
      "../src/components/login.tsx",
      {
        "./session": { useSession: () => ({ account: { user: { name: "Sam" } }, admin }) },
        "./shell": { Brand: () => null },
        "next/script": { default: () => null },
        "next/image": { default: () => null },
      },
      { process: { env: {} } },
    );
    return renderToStaticMarkup(createElement(Login, { returnTo }));
  }
  assert.match(login(false, "/user/settings"), /href="\/user\/settings"/);
  assert.match(login(true), /href="\/admin"/);
  assert.match(login(false), /href="\/user\/home"/);
  assert.doesNotMatch(login(false, "https://example.org"), /example.org/);
});
