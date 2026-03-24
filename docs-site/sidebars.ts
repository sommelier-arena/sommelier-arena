import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: ['quick-start', 'cloudflare-setup', 'deployment'],
    },
    {
      type: 'category',
      label: 'Game Design',
      collapsed: false,
      items: ['overview', 'features', 'user-stories', 'gameplay-workflow'],
    },
    {
      type: 'category',
      label: 'Technical Reference',
      collapsed: false,
      items: [
        'architecture',
        'tech-stack',
        'networking',
        'event-reference',
        'data-persistence',
        'local-vs-prod',
        'host-identity',
        'proxy-worker',
      ],
    },
    {
      type: 'category',
      label: 'Development',
      collapsed: true,
      items: ['env', 'prd'],
    },
  ],
};

export default sidebars;
