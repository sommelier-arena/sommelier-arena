Docs site — local search

This project uses a local, file-based search plugin for Docusaurus to provide a search box in the docs navbar.

Quick start (local):

1. Install dependencies:

   cd docs-site
   npm ci

2. Start the dev server:

   npm run start

3. Open http://localhost:3002 (or your DOCS_BASE_URL) and use the search box in the navbar.

Notes
- The plugin dependency (@cmfcmf/docusaurus-search-local) is declared in package.json and will be installed by `npm ci`.
- The site configuration in docusaurus.config.ts will load the plugin if installed. If you build the docs inside Docker or CI, `npm ci` in the Dockerfile will ensure the plugin is available at build time.
- If `npm ci` fails in your environment, inspect the npm logs and ensure a network/proxy is configured correctly.
