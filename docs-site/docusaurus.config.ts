import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// DOCS_BASE_URL controls the base path:
//   - Docker / local dev: set to "/" (default) — docs served directly at localhost:3002/
//   - Production Cloudflare: set to "/docs/" — served via proxy worker at your-domain/docs/
const baseUrl = process.env.DOCS_BASE_URL ?? '/';

// Attempt to load the local search plugin if installed. In CI or local
// environments where the package isn't available, fall back to Algolia
// configuration (if provided via environment) or no-search.
let localSearchPlugin: any = null;
try {
  // Require will throw if the plugin isn't installed — that's OK.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  localSearchPlugin = require('@cmfcmf/docusaurus-search-local');
} catch (e) {
  // plugin not installed; proceed without it
}


const config: Config = {
  title: 'Sommelier Arena',
  tagline: 'Real-time blind wine tasting quiz — developer docs',
  favicon: 'img/favicon.ico',

  url: 'https://sommelier-arena.ducatillon.net',
  baseUrl,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: localSearchPlugin
    ? [
        // Local, file-based search plugin — works without external services.
        [
          localSearchPlugin,
          {
            indexDocs: true,
            indexPages: true,
            indexBlog: false,
            language: 'en',
          },
        ],
      ]
    : [],


  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/',
          lastVersion: 'current',
          versions: {
            current: {
              label: '2.0 PartyKit',
              path: '/',
            },
            '1.0-nestjs': {
              label: '1.0 NestJS (legacy)',
              path: '/v1',
              banner: 'unmaintained',
            },
          },
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Algolia DocSearch configuration (fallback if local plugin isn't present).
    // Set DOCSEARCH_APP_ID, DOCSEARCH_API_KEY and DOCSEARCH_INDEX_NAME in
    // environment for Algolia to activate. Leave unset to disable Algolia.
    algolia: process.env.DOCSEARCH_API_KEY
      ? {
          appId: process.env.DOCSEARCH_APP_ID ?? '',
          apiKey: process.env.DOCSEARCH_API_KEY ?? '',
          indexName: process.env.DOCSEARCH_INDEX_NAME ?? '',
        }
      : undefined,

    navbar: {
      title: '🍷 Sommelier Arena',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
        },
        // The local search plugin injects a search bar automatically. No
        // additional navbar item is required. If Algolia is configured via
        // environment variables, Docusaurus will prefer it.
      ],
    },
    footer: {
      style: 'light',
      copyright: `Sommelier Arena MVP — ${new Date().getFullYear()}`,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
