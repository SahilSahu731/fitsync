// Serializing SDK identity changes and transactions prevents a purchase from
// being attributed to whichever account happened to log in during the flow.
export type IdentitySdk = {
  configure: (options: { apiKey: string; appUserID: string }) => void;
  getAppUserID: () => Promise<string>;
  logIn: (id: string) => Promise<unknown>;
  logOut: () => Promise<unknown>;
};

export function createStoreSession<Sdk extends IdentitySdk>(load: () => Sdk, apiKey: () => string | null) {
  let sdk: Sdk | null = null;
  let configured = false;
  let desired: string | null = null;
  let current: string | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T,>(action: () => Promise<T>): Promise<T> => {
    const result = queue.then(action, action);
    queue = result.catch(() => undefined);
    return result;
  };
  const check = (id: string) => {
    if (desired !== id) throw new Error("Your account changed. Please try again.");
  };
  const connect = async (id: string) => {
    check(id);
    const key = apiKey();
    if (!key) throw new Error("Subscriptions are not available in this build yet.");
    sdk ??= load();
    if (!configured) {
      sdk.configure({ apiKey: key, appUserID: id });
      configured = true;
    }
    if (await sdk.getAppUserID() !== id) await sdk.logIn(id);
    check(id);
    if (await sdk.getAppUserID() !== id) throw new Error("Could not connect your subscription account. Please retry.");
    current = id;
    return sdk;
  };
  return {
    identify(id: string | null) {
      // This changes immediately, before queued work has finished.
      desired = id;
      return serial(async () => {
        if (desired !== id) return;
        if (id) { await connect(id); return; }
        current = null;
        if (sdk && configured) {
          // A failed logout must still leave local authorization cleared.
          await sdk.logOut();
        }
      });
    },
    withUser<T>(id: string, action: (sdk: Sdk) => Promise<T>) {
      return serial(async () => {
        check(id);
        const client = await connect(id);
        const result = await action(client);
        check(id);
        return result;
      });
    },
    get currentUser() { return desired === current ? current : null; },
  };
}
