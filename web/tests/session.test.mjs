import test from "node:test";
import assert from "node:assert/strict";
import { loadTypeScript } from "./load-typescript.mjs";

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const account = (id) => ({ user: { id, name: id } });
function fixture({ logoutResponse = Response.json({}) } = {}) {
  const hooks = [],
    effects = [],
    requests = [],
    events = new Map(),
    destinations = [];
  let cursor = 0;
  const router = { replace: (path) => destinations.push(path), refresh() {} };
  const memo = (create, deps) => {
    const index = cursor++;
    const previous = hooks[index];
    if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i])))
      hooks[index] = { value: create(), deps };
    return hooks[index].value;
  };
  const react = {
    createContext: () => ({ Provider: "Provider" }),
    useState(initial) {
      const index = cursor++;
      if (!hooks[index])
        hooks[index] = { value: typeof initial === "function" ? initial() : initial };
      return [
        hooks[index].value,
        (next) => {
          hooks[index].value = typeof next === "function" ? next(hooks[index].value) : next;
        },
      ];
    },
    useRef: (initial) => memo(() => ({ current: initial }), []),
    useMemo: memo,
    useCallback: (callback, deps) => memo(() => callback, deps),
    useEffect(create, deps) {
      const index = cursor++;
      const previous = hooks[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        effects.push(() => {
          previous?.cleanup?.();
          hooks[index] = { deps, cleanup: create() };
        });
      }
    },
  };
  const { SessionProvider } = loadTypeScript(
    "../src/components/session.tsx",
    {
      react,
      "react/jsx-runtime": {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
      },
      "next/link": {},
      "next/navigation": { useRouter: () => router },
      "./icon": {},
      "@/lib/api": {
        ApiError: class ApiError extends Error {},
        api(path) {
          const operation = deferred();
          requests.push({ path, ...operation });
          return operation.promise;
        },
      },
    },
    {
      setTimeout: () => 1,
      clearTimeout: () => {},
      fetch: async () => logoutResponse,
      window: {
        addEventListener: (name, listener) => events.set(name, listener),
        removeEventListener: (name) => events.delete(name),
        location: { assign: (path) => destinations.push(path) },
      },
    },
  );
  return {
    requests,
    destinations,
    expire: () => events.get("fitsync-session-expired")(),
    render() {
      cursor = 0;
      const result = SessionProvider({ children: null }).props.value;
      effects.splice(0).forEach((effect) => effect());
      return result;
    },
  };
}

test("account and permissions load together and the newest reload wins", async () => {
  const f = fixture();
  const value = f.render();
  const first = value.reload();
  assert.deepEqual(
    f.requests.map(({ path }) => path),
    ["/me", "/exercises/permissions"],
  );
  const second = value.reload();
  f.requests[2].resolve(account("new-user"));
  f.requests[3].resolve({ canManageExercises: false });
  await second;
  f.requests[0].resolve(account("old-admin"));
  f.requests[1].resolve({ canManageExercises: true });
  await first;
  assert.equal(f.render().account.user.id, "new-user");
  assert.equal(f.render().admin, false);
});

test("session expiry invalidates pending reloads and profile saves", async () => {
  const f = fixture();
  const value = f.render();
  const pending = value.reload();
  f.expire();
  f.requests[0].resolve(account("expired-user"));
  f.requests[1].resolve({ canManageExercises: true });
  await pending;
  value.updateAccount(account("expired-user"));
  assert.equal(f.render().account, null);
  assert.equal(f.render().admin, false);
  assert.equal(f.render().loading, false);
});

test("a stale profile response cannot overwrite a different signed-in account", async () => {
  const f = fixture();
  const value = f.render();
  const pending = value.reload();
  f.requests[0].resolve(account("current-user"));
  f.requests[1].resolve({ canManageExercises: false });
  await pending;
  value.updateAccount(account("previous-user"));
  assert.equal(f.render().account.user.id, "current-user");
  value.updateAccount({ user: { id: "current-user", name: "Updated" } });
  assert.equal(f.render().account.user.name, "Updated");
});

test("logout invalidates account reads and reports a failed browser logout", async () => {
  const f = fixture();
  const value = f.render();
  const pending = value.reload();
  await value.logout();
  f.requests[0].resolve(account("old-user"));
  f.requests[1].resolve({ canManageExercises: true });
  await pending;
  assert.equal(f.render().account, null);
  assert.deepEqual(f.destinations, ["/"]);

  const failed = fixture({ logoutResponse: Response.json({}, { status: 503 }) });
  await failed.render().logout();
  assert.match(failed.render().error, /Could not sign out/);
  assert.equal(failed.render().loading, false);
  assert.deepEqual(failed.destinations, []);
});
