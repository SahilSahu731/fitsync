# Formatting

Each project has its own pinned Prettier development dependency, `.prettierrc.json`, and `.prettierignore`. Commands format only the selected project, including its supported source files, tests, scripts, configuration, and Markdown files.

From the repository root:

```bash
cd mobile
npm run format
```

Use the same commands from `server` or `web` to format those projects. Alternatively, run from the repository root:

```bash
npm --prefix mobile run format
npm --prefix server run format
npm --prefix web run format
```

To check without changing files:

```bash
npm run format:check
```

All three configurations use two-space indentation, double quotes, semicolons, trailing commas, LF line endings, and a 100-character preferred line width. Dependencies, lockfiles, build output, caches, credentials, generated native projects, and generated/static assets are excluded.

Custom npm scripts use `npm run format`, rather than `npm format`. Install development dependencies with `npm ci` after pulling these changes. Existing source files are not automatically reformatted by installing Prettier; run the format command when you want to apply the style.
