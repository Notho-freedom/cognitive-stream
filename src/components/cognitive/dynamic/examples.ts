/**
 * 🧠 COGNITIVE UI - Exemples de schémas JSON
 * 
 * Ces exemples montrent comment l'IA peut construire des interfaces
 * en retournant du JSON structuré.
 */

import { CognitiveUISchema } from './types';

/**
 * Exemple: Liste des pays d'Afrique
 * L'IA pourrait retourner ce schéma en réponse à "Liste-moi les pays d'Afrique"
 */
export const countriesListExample: CognitiveUISchema = {
  version: '1.0',
  intent: 'primary',
  blocks: [
    {
      type: 'list',
      id: 'countries',
      variant: 'interactive',
      title: 'Pays d\'Afrique',
      description: 'Voici une liste des pays d\'Afrique avec leurs codes ISO',
      items: [
        { id: 'ng', content: 'Nigeria', action: { id: 'select_country', payload: { code: 'NG' } } },
        { id: 'eg', content: 'Égypte', action: { id: 'select_country', payload: { code: 'EG' } } },
        { id: 'za', content: 'Afrique du Sud', action: { id: 'select_country', payload: { code: 'ZA' } } },
        { id: 'ke', content: 'Kenya', action: { id: 'select_country', payload: { code: 'KE' } } },
        { id: 'ma', content: 'Maroc', action: { id: 'select_country', payload: { code: 'MA' } } },
      ],
    },
  ],
};

/**
 * Exemple: Formulaire de question
 * L'IA demande une information à l'utilisateur
 */
export const questionFormExample: CognitiveUISchema = {
  version: '1.0',
  intent: 'focus',
  blocks: [
    {
      type: 'text',
      id: 'question',
      content: 'Quel type de projet voulez-vous créer ?',
      variant: 'heading',
    },
    {
      type: 'choice',
      id: 'project_type',
      options: [
        { id: 'web', label: 'Application Web', description: 'Site ou webapp React', icon: '' },
        { id: 'mobile', label: 'Application Mobile', description: 'App iOS/Android', icon: '' },
        { id: 'api', label: 'API Backend', description: 'Service REST/GraphQL', icon: '' },
        { id: 'other', label: 'Autre', description: 'Décrivez votre projet', icon: '' },
      ],
      action: { id: 'select_project_type', type: 'select' },
    },
    {
      type: 'stack',
      id: 'actions',
      direction: 'horizontal',
      justify: 'end',
      gap: 'md',
      children: [
        {
          type: 'button',
          id: 'cancel',
          label: 'Annuler',
          variant: 'ghost',
          action: { id: 'cancel', type: 'dismiss' },
        },
        {
          type: 'button',
          id: 'confirm',
          label: 'Continuer',
          variant: 'glow',
          action: { id: 'confirm_selection', type: 'submit' },
        },
      ],
    },
  ],
};

/**
 * Exemple: Dashboard avec métriques
 */
export const dashboardExample: CognitiveUISchema = {
  version: '1.0',
  blocks: [
    {
      type: 'grid',
      id: 'metrics',
      columns: 3,
      gap: 'md',
      children: [
        {
          type: 'card',
          id: 'users_card',
          variant: 'glass',
          title: 'Utilisateurs',
          children: [
            { type: 'text', id: 'users_value', content: '12,847', variant: 'heading', intent: 'primary' },
            { type: 'progress', id: 'users_progress', value: 78, label: 'Objectif mensuel', showValue: true, intent: 'success' },
          ],
        },
        {
          type: 'card',
          id: 'revenue_card',
          variant: 'glass',
          title: 'Revenus',
          children: [
            { type: 'text', id: 'revenue_value', content: '€45,230', variant: 'heading', intent: 'secondary' },
            { type: 'badge', id: 'revenue_badge', text: '+12.5%', icon: '', intent: 'success' },
          ],
        },
        {
          type: 'card',
          id: 'tasks_card',
          variant: 'glass',
          title: 'Tâches',
          children: [
            { type: 'keyvalue', id: 'tasks_kv', pairs: [
              { key: 'En cours', value: 23 },
              { key: 'Terminées', value: 156 },
            ]},
          ],
        },
      ],
    },
    {
      type: 'divider',
      id: 'div',
      label: 'Activité récente',
    },
    {
      type: 'card',
      id: 'activity',
      variant: 'framed',
      title: 'Dernières actions',
      collapsible: true,
      children: [
        {
          type: 'list',
          id: 'activity_list',
          variant: 'bullet',
          items: [
            { id: 'a1', content: 'Nouveau client inscrit - il y a 5 min' },
            { id: 'a2', content: 'Commande #1234 validée - il y a 12 min' },
            { id: 'a3', content: 'Rapport mensuel généré - il y a 1h' },
          ],
        },
      ],
    },
    {
      type: 'status',
      id: 'status',
      status: 'idle',
      message: 'Système prêt',
    },
    {
      type: 'skeleton',
      id: 'skeleton_card',
      variant: 'card',
    },
    {
      type: 'skeleton',
      id: 'skeleton_list',
      variant: 'list',
      lines: 4,
    },
    {
      type: 'input',
      id: 'feedback_input',
      placeholder: 'Partagez vos impressions...',
      action: { id: 'submit_feedback', type: 'submit' },
      onChange: { id: 'update_feedback', type: 'submit' },
      inputType: 'text',
    },
    {
      type: 'divider',
      id: 'div',
      label: 'Options',
    },
    {
      type: 'stack',
      id: 'options',
      direction: 'horizontal',
      gap: 'md',
      children: [
        {
          type: 'button',
          id: 'settings',
          label: 'Paramètres',
          variant: 'outline', 
          action: { id: 'open_settings', type: 'navigate' },
        },
        {
          type: 'button',
          id: 'logout',
          label: 'Se déconnecter',
          variant: 'ghost',
          action: { id: 'logout', type: 'navigate' },
        },
      ],
    },
  ],
};

/**
 * Exemple: État de chargement
 */
export const loadingExample: CognitiveUISchema = {
  version: '1.0',
  blocks: [
    {
      type: 'status',
      id: 'loading',
      status: 'loading',
      message: 'Analyse en cours...',
    },
    {
      type: 'skeleton',
      id: 'skeleton_card',
      variant: 'card',
    },
    {
      type: 'skeleton',
      id: 'skeleton_list',
      variant: 'list',
      lines: 4,
    },
  ],
};

/**
 * Exemple: État vide
 */
export const emptyExample: CognitiveUISchema = {
  version: '1.0',
  blocks: [
    {
      type: 'empty',
      id: 'empty',
      title: 'Aucun résultat',
      description: 'Essayez de modifier vos critères de recherche',
      icon: '🔍',
      action: {
        type: 'button',
        id: 'retry',
        label: 'Nouvelle recherche',
        action: { id: 'new_search', type: 'navigate' },
      },
    },
  ],
};
