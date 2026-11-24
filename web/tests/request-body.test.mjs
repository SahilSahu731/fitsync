import test from "node:test";
import assert from "node:assert/strict";
import { loadTypeScript } from "./load-typescript.mjs";

const { readRequestBody, RequestBodyTooLarge } = loadTypeScript("../src/lib/request-body.ts");

test("streamed request bodies are bounded even without a trusted Content-Length", async () => {
  let cancelled = false;
  let pulls = 0;
  const body = new ReadableStream({
    pull(controller) {
      pulls++;
      controller.enqueue(new Uint8Array(8));
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request("http://localhost/upload", { method: "POST", body, duplex: "half" });
  await assert.rejects(readRequestBody(request, 12), RequestBodyTooLarge);
  assert.equal(cancelled, true);
  assert.ok(pulls <= 3, "stop pulling the upload as soon as it exceeds the limit");
});

test("declared oversized bodies are rejected without reading; exact size is preserved", async () => {
  const oversized = new Request("http://localhost/upload", {
    method: "POST",
    headers: { "Content-Length": "500" },
    body: "ignored",
  });
  await assert.rejects(readRequestBody(oversized, 12), RequestBodyTooLarge);
  const body = await readRequestBody(
    new Request("http://localhost/upload", {
      method: "POST",
      body: "aé🙂",
    }),
    7,
  );
  assert.equal(new TextDecoder().decode(body), "aé🙂");
  assert.equal(body.byteLength, 7);
  assert.equal((await readRequestBody(new Request("http://localhost"), 12)).byteLength, 0);
});

test("stream failures propagate and release their reader", async () => {
  const failure = new Error("Connection lost");
  const request = new Request("http://localhost/upload", {
    method: "POST",
    duplex: "half",
    body: new ReadableStream({
      start(controller) {
        controller.error(failure);
      },
    }),
  });
  await assert.rejects(readRequestBody(request, 12), failure);
  assert.equal(request.body.locked, false);
});
