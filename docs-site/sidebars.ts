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
        'host-identity',
        'networking',
        'proxy-worker',
        'configuration',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      collapsed: false,
      items: ['deployment-and-deploy'],
    },
    {
      type: 'category',
      label: 'Contributing',
      collapsed: true,
      items: ['prd', 'for-developers', 'for-product', 'for-automation'],
    },
  ],
};

export default sidebars;
