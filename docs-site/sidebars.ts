import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: ['quick-start'],
    },
    {
      type: 'category',
      label: 'Game Design',
      collapsed: false,
      items: ['features', 'gameplay-workflow'],
    },
    {
      type: 'category',
      label: 'Technical Reference',
      collapsed: false,
      items: [
        'architecture',
        'tech-stack',
        'event-reference',
        'data-persistence',
        'host-and-participant-identity',
      ],
    },
    {
      type: 'category',
      label: 'Configuration & Deployment',
      collapsed: false,
      items: ['configuration', 'deployment-guide', 'proxy-worker'],
    },
    {
      type: 'category',
      label: 'Administration',
      collapsed: false,
      items: ['admin-dashboard', 'adr-wine-answers-storage'],
    },
    {
      type: 'category',
      label: 'Contributing',
      collapsed: true,
      items: ['for-product', 'for-developers', 'prd'],
    },
  ],
};

export default sidebars;
