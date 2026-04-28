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
  favicon: 'img/favicon.svg',

  url: 'https://sommelier-arena.ducatillon.net',
  baseUrl,

  onBrokenLinks: 'warn',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },


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


  themes: ['@docusaurus/theme-mermaid'],

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
    // Local search only: the local plugin injects a search bar into the navbar.

    navbar: {
      title: '🍷 Play with Sommelier Arena',
      logo: {
        alt: 'Sommelier Arena',
        src: 'img/favicon.svg',
        href: 'https://sommelier-arena.ducatillon.net/',
        target: '_self',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Read the Docs',
        },
        {
          href: 'https://github.com/sommelier-arena/sommelier-arena/',
          label: 'Contribute to Git Repository',
          position: 'left',
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
      copyright: `Sommelier Arena — Built with ❤️ by <a href="https://notes.ducatillon.net/" target="_blank" rel="noopener">François Ducatillon</a>`,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
