import test from "node:test";
import assert from "node:assert/strict";
import {
  explainPermission,
  registerPermissionPresenter,
  requestPermissionWithExplanation,
} from "../src/services/permission-prompts.ts";

const denied = { granted: false, canAskAgain: true };

test("missing consent never opens an OS prompt, and declining automatic rest does not keep asking", async () => {
  let requests = 0;
  const request = async () => {
    requests++;
    return { granted: true };
  };
  assert.equal(await requestPermissionWithExplanation("rest", denied, request), false);
  const explanations = [];
  const unmount = registerPermissionPresenter((prompt, complete) => {
    explanations.push(prompt.kind);
    complete(prompt.kind !== "rest");
  });
  try {
    assert.equal(await requestPermissionWithExplanation("rest", denied, request), false);
    assert.equal(await requestPermissionWithExplanation("rest", denied, request), false);
    assert.deepEqual(explanations, ["rest"]);
    assert.equal(requests, 0);
    assert.equal(await requestPermissionWithExplanation("notifications", denied, request), true);
    assert.deepEqual(explanations, ["rest", "notifications"]);
    assert.equal(requests, 1, "an explicit reminder opt-in remains available after declining rest");
  } finally {
    unmount();
  }
});

test("already granted access skips both explanations and OS permission requests", async () => {
  let explanations = 0;
  const unmount = registerPermissionPresenter(() => explanations++);
  try {
    const granted = await requestPermissionWithExplanation("motion", { granted: true }, async () =>
      assert.fail("Already granted access must not request again"),
    );
    assert.equal(granted, true);
    assert.equal(explanations, 0);
  } finally {
    unmount();
  }
});

test("permanent denial presents the settings explanation and never reopens the OS prompt", async () => {
  const prompts = [];
  const unmount = registerPermissionPresenter((prompt, complete) => {
    prompts.push(prompt);
    complete(true);
  });
  try {
    assert.equal(
      await requestPermissionWithExplanation(
        "notifications",
        { granted: false, canAskAgain: false },
        async () => assert.fail("Permanently denied access must not request again"),
      ),
      false,
    );
    assert.deepEqual(prompts, [{ kind: "notifications", blocked: true }]);
  } finally {
    unmount();
  }
});

test("concurrent notification features share one explanation and one native request", async () => {
  let explain,
    explanations = 0,
    requests = 0;
  const unmount = registerPermissionPresenter((_prompt, complete) => {
    explanations++;
    explain = complete;
  });
  const request = async () => {
    requests++;
    return { granted: true };
  };
  try {
    const rest = requestPermissionWithExplanation("rest", denied, request);
    const meal = requestPermissionWithExplanation("meals", denied, request);
    assert.equal(rest, meal);
    assert.equal(explanations, 1);
    assert.equal(requests, 0);
    explain(true);
    assert.deepEqual(await Promise.all([rest, meal]), [true, true]);
    assert.equal(requests, 1);
  } finally {
    unmount();
  }
});

test("unmounting the presenter resolves pending consent as declined and ignores late acceptance", async () => {
  let complete;
  const unmount = registerPermissionPresenter((_prompt, done) => {
    complete = done;
  });
  const pending = requestPermissionWithExplanation("motion", denied, async () =>
    assert.fail("An unmounted presenter cannot approve access"),
  );
  unmount();
  complete(true);
  assert.equal(await pending, false);
  assert.equal(await explainPermission("steps"), false);

  let releaseNative;
  const nativeResult = new Promise((resolve) => {
    releaseNative = resolve;
  });
  let started;
  const nativeStarted = new Promise((resolve) => {
    started = resolve;
  });
  const stop = registerPermissionPresenter((_prompt, done) => done(true));
  const inFlight = requestPermissionWithExplanation("motion", denied, () => {
    started();
    return nativeResult;
  });
  await nativeStarted;
  stop();
  releaseNative({ granted: true });
  assert.equal(await inFlight, false, "a late native grant cannot approve the old account");
});

test("replacing the presenter after acceptance fences the old account before its native request", async () => {
  let accept;
  const oldUnmount = registerPermissionPresenter((_prompt, complete) => {
    accept = complete;
  });
  const oldRequest = requestPermissionWithExplanation("notifications", denied, async () =>
    assert.fail("The replaced account cannot open a native permission request"),
  );
  accept(true);
  let newRequests = 0;
  const unmount = registerPermissionPresenter((_prompt, complete) => complete(true));
  try {
    oldUnmount();
    const newRequest = requestPermissionWithExplanation("notifications", denied, async () => {
      newRequests++;
      return { granted: true };
    });
    assert.notEqual(newRequest, oldRequest);
    assert.deepEqual(await Promise.all([oldRequest, newRequest]), [false, true]);
    assert.equal(newRequests, 1);
  } finally {
    unmount();
  }
});
