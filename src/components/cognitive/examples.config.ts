import { ComponentConfig } from './DynamicRenderer';

// ═══════════════════════════════════════════════════════
// EXEMPLE 1: Liste des pays d'Afrique
// ═══════════════════════════════════════════════════════

export const africanCountriesConfig: ComponentConfig[] = [
  {
    type: 'text',
    variant: 'title',
    content: 'Pays d\'Afrique',
    align: 'center',
    animation: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.5 }
    }
  },
  {
    type: 'stats',
    columns: 3,
    metrics: [
      { label: 'Total Pays', value: 54, trend: 'neutral' },
      { label: 'Population', value: '1.3B', trend: 'up', change: 2.5 },
      { label: 'Superficie', value: '30.3M km²', trend: 'neutral' },
    ],
    animation: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      transition: { delay: 0.2 }
    }
  },
  {
    type: 'list',
    variant: 'detailed',
    selectable: true,
    items: [
      {
        id: 'nigeria',
        label: 'Nigeria',
        description: 'Population: 206M • Capitale: Abuja',
        icon: '🇳🇬',
        metadata: { region: 'West', population: 206000000 }
      },
      {
        id: 'ethiopia',
        label: 'Éthiopie',
        description: 'Population: 115M • Capitale: Addis-Abeba',
        icon: '🇪🇹',
        metadata: { region: 'East', population: 115000000 }
      },
      {
        id: 'egypt',
        label: 'Égypte',
        description: 'Population: 102M • Capitale: Le Caire',
        icon: '🇪🇬',
        metadata: { region: 'North', population: 102000000 }
      },
      {
        id: 'dr_congo',
        label: 'RD Congo',
        description: 'Population: 89M • Capitale: Kinshasa',
        icon: '🇨🇩',
        metadata: { region: 'Central', population: 89000000 }
      },
      {
        id: 'south_africa',
        label: 'Afrique du Sud',
        description: 'Population: 59M • Capitale: Pretoria',
        icon: '🇿🇦',
        metadata: { region: 'South', population: 59000000 }
      },
    ],
    onSelect: (id: string) => console.log('Selected country:', id),
    animation: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { delay: 0.4 }
    }
  },
];

// ═══════════════════════════════════════════════════════
// EXEMPLE 2: Interface de question/réponse
// ═══════════════════════════════════════════════════════

export const quizInterfaceConfig: ComponentConfig = {
  type: 'card',
  title: 'Question Cognitive',
  subtitle: 'Sélectionnez la meilleure réponse',
  variant: 'glass',
  content: [
    {
      type: 'text',
      variant: 'body',
      content: 'Quel est le plus grand continent du monde par superficie ?',
      className: 'mb-6'
    },
    {
      type: 'list',
      variant: 'checkable',
      selectable: true,
      items: [
        { id: 'asia', label: 'Asie', description: '44.5 millions km²' },
        { id: 'africa', label: 'Afrique', description: '30.3 millions km²' },
        { id: 'america', label: 'Amérique', description: '42.5 millions km²' },
        { id: 'antarctica', label: 'Antarctique', description: '14.2 millions km²' },
      ],
      onSelect: (id: string) => {
        console.log('Answer selected:', id);
        if (id === 'asia') {
          console.log('✓ Correct!');
        } else {
          console.log('✗ Incorrect');
        }
      }
    }
  ],
  actions: [
    {
      label: 'Valider',
      variant: 'primary',
      onClick: () => console.log('Submit answer')
    },
    {
      label: 'Passer',
      variant: 'ghost',
      onClick: () => console.log('Skip question')
    }
  ]
};

// ═══════════════════════════════════════════════════════
// EXEMPLE 3: Dashboard analytique
// ═══════════════════════════════════════════════════════

export const dashboardConfig: ComponentConfig[] = [
  {
    type: 'text',
    variant: 'title',
    content: 'Tableau de bord système',
    className: 'mb-6'
  },
  {
    type: 'grid',
    columns: 2,
    gap: 20,
    children: [
      {
        type: 'card',
        title: 'Performance CPU',
        content: {
          type: 'progress',
          label: 'Utilisation actuelle',
          value: 67,
          max: 100,
          showPercentage: true,
          variant: 'bar'
        }
      },
      {
        type: 'card',
        title: 'Mémoire RAM',
        content: {
          type: 'progress',
          label: 'Utilisation actuelle',
          value: 82,
          max: 100,
          showPercentage: true,
          variant: 'bar'
        }
      }
    ]
  },
  {
    type: 'card',
    title: 'Activité réseau',
    className: 'mt-6',
    content: {
      type: 'chart',
      chartType: 'bar',
      data: [
        { label: 'Lun', value: 45 },
        { label: 'Mar', value: 62 },
        { label: 'Mer', value: 58 },
        { label: 'Jeu', value: 73 },
        { label: 'Ven', value: 81 },
        { label: 'Sam', value: 39 },
        { label: 'Dim', value: 28 },
      ],
      height: 180
    }
  }
];

// ═══════════════════════════════════════════════════════
// EXEMPLE 4: Timeline d'événements
// ═══════════════════════════════════════════════════════

export const timelineConfig: ComponentConfig = {
  type: 'card',
  title: 'Historique des actions',
  content: {
    type: 'timeline',
    orientation: 'vertical',
    events: [
      {
        id: '1',
        timestamp: '14:32:15',
        title: 'Connexion établie',
        description: 'Réseau neural activé avec succès',
        status: 'completed'
      },
      {
        id: '2',
        timestamp: '14:33:02',
        title: 'Analyse des données',
        description: 'Traitement de 2.4 MB de données',
        status: 'completed'
      },
      {
        id: '3',
        timestamp: '14:34:18',
        title: 'Génération du rapport',
        description: 'En cours de traitement...',
        status: 'active'
      },
      {
        id: '4',
        timestamp: '14:35:00',
        title: 'Export des résultats',
        description: 'En attente',
        status: 'pending'
      },
    ]
  }
};

// ═══════════════════════════════════════════════════════
// EXEMPLE 5: Formulaire de recherche
// ═══════════════════════════════════════════════════════

export const searchFormConfig: ComponentConfig = {
  type: 'card',
  title: 'Recherche avancée',
  subtitle: 'Interrogez la base de connaissances',
  content: [
    {
      type: 'input',
      label: 'Requête',
      placeholder: 'Entrez votre recherche...',
      onSubmit: (value: string) => console.log('Search for:', value),
      suggestions: ['Machine Learning', 'Quantum Computing', 'Neural Networks']
    },
    {
      type: 'layout',
      direction: 'row',
      gap: 12,
      className: 'mt-4',
      children: [
        {
          type: 'button',
          label: 'Rechercher',
          variant: 'primary',
          onClick: () => console.log('Execute search')
        },
        {
          type: 'button',
          label: 'Réinitialiser',
          variant: 'ghost',
          onClick: () => console.log('Clear form')
        }
      ]
    }
  ]
};

// ═══════════════════════════════════════════════════════
// EXEMPLE 6: Comparaison de produits
// ═══════════════════════════════════════════════════════

export const productComparisonConfig: ComponentConfig = {
  type: 'grid',
  columns: 3,
  gap: 20,
  children: [
    {
      type: 'card',
      title: 'Plan Basic',
      subtitle: '9€/mois',
      content: [
        {
          type: 'list',
          variant: 'simple',
          items: [
            { id: '1', label: '✓ 10 GB Stockage' },
            { id: '2', label: '✓ Support Email' },
            { id: '3', label: '✗ API Access' },
          ]
        }
      ],
      actions: [
        {
          label: 'Choisir',
          variant: 'ghost',
          onClick: () => console.log('Select Basic')
        }
      ]
    },
    {
      type: 'card',
      title: 'Plan Pro',
      subtitle: '29€/mois',
      content: [
        {
          type: 'list',
          variant: 'simple',
          items: [
            { id: '1', label: '✓ 100 GB Stockage' },
            { id: '2', label: '✓ Support Prioritaire' },
            { id: '3', label: '✓ API Access' },
          ]
        }
      ],
      actions: [
        {
          label: 'Choisir',
          variant: 'primary',
          onClick: () => console.log('Select Pro')
        }
      ]
    },
    {
      type: 'card',
      title: 'Plan Enterprise',
      subtitle: 'Sur mesure',
      content: [
        {
          type: 'list',
          variant: 'simple',
          items: [
            { id: '1', label: '✓ Stockage illimité' },
            { id: '2', label: '✓ Support 24/7' },
            { id: '3', label: '✓ Custom Features' },
          ]
        }
      ],
      actions: [
        {
          label: 'Contacter',
          variant: 'secondary',
          onClick: () => console.log('Contact sales')
        }
      ]
    }
  ]
};

// ═══════════════════════════════════════════════════════
// EXPORT ALL EXAMPLES
// ═══════════════════════════════════════════════════════

export const AI_EXAMPLES = {
  africanCountries: africanCountriesConfig,
  quiz: quizInterfaceConfig,
  dashboard: dashboardConfig,
  timeline: timelineConfig,
  searchForm: searchFormConfig,
  productComparison: productComparisonConfig,
};
