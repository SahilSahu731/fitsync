# Vendored query decoder security patches

Expo Router 57 uses the CommonJS API of `query-string` 7.1.3. Its original decoder, `decode-uri-component` 0.2.2, has denial-of-service issues on malformed percent-encoded input. The maintainer fixed both issues in 0.5.1, which exports an ES module default function. Replacing the decoder directly would break `query-string`'s synchronous `require()` function call.

These local, private packages retain the existing API without changing the Expo SDK or native modules:

- `query-string` is upstream 7.1.3, identified locally as `7.1.3+fitsync.1`. Its JavaScript and TypeScript declarations are unchanged. Only package metadata and the decoder dependency are changed.
- `decode-uri-component` is upstream 0.5.1, identified locally as `0.5.1+fitsync.cjs.1`. Its sole JavaScript change replaces `export default function decodeUriComponent` with `module.exports = function decodeUriComponent`. The decoding algorithm is unchanged.

Both packages retain their upstream MIT licenses in their respective `license` files. Each `package.json` records the upstream version, tag URL, source SHA-256, and local modification. The hashes describe the original upstream `index.js`, before adapting the decoder export.

Upstream sources:

- [query-string 7.1.3](https://github.com/sindresorhus/query-string/tree/v7.1.3)
- [decode-uri-component 0.5.1](https://github.com/SamVerschueren/decode-uri-component/tree/v0.5.1)
- [Exponential decoding advisory](https://github.com/SamVerschueren/decode-uri-component/security/advisories/GHSA-vcc3-ghjq-m6fr)
- [Quadratic replacement advisory](https://github.com/SamVerschueren/decode-uri-component/security/advisories/GHSA-qr28-fpjm-wq7f)

The root package lists both local file dependencies so npm can hoist them into the dependency path used by Router. `query-string` also refers to its sibling local decoder. A local-file npm override was tested and rejected by npm 9.2.0 with `Invalid comparator`, so this setup uses no override for these two packages. `tests/dependency-security.test.mjs` checks resolution from the actual installed Router, real query parsing and navigation, source provenance, and bounded malformed-input execution. A clean isolated `npm ci` was verified before integration.

Separately, the scoped `@expo/fingerprint` override selects patched `minimatch` 11.0.5 while preserving its CommonJS `Minimatch` consumer API. See [the maintainer advisory](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249).

Development tooling uses Expo's compatible TypeScript ESLint 8.74.0 chain, which selects patched `minimatch` 11.0.9. A separate scoped `@expo/ngrok` override selects `uuid` 11.1.1 and retains the tunnel's CommonJS `uuid.v4()` call. The [UUID advisory](https://github.com/uuidjs/uuid/security/advisories/GHSA-w5hq-g745-h8pq) concerns other UUID methods with caller-provided output buffers; the tunnel calls `v4()` without arguments.

Keep these packages pinned and retain the regression tests. When the compatible Expo Router release adopts a patched decoder, replace the local dependencies with the upstream resolution, remove the vendor packages, and verify a clean install, navigation tests, typecheck, and Android export. Lockfile changes can change the app's fingerprint runtime version; create a matching Android build before publishing an update to that runtime.
