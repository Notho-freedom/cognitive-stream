import { ComponentConfig } from './DynamicRenderer';

/**
 * 🛡️ Validation & Utilities pour Dynamic Renderer
 * 
 * Ce fichier contient des utilitaires pour valider, transformer,
 * et optimiser les configurations JSON générées par l'IA.
 */

// ═══════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Valide une configuration avant le rendu
 */
export function validateConfig(config: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config) {
    errors.push('Configuration is null or undefined');
    return { valid: false, errors, warnings };
  }

  // Validation récursive pour les arrays
  if (Array.isArray(config)) {
    config.forEach((item, index) => {
      const result = validateConfig(item);
      errors.push(...result.errors.map(e => `[${index}] ${e}`));
      warnings.push(...result.warnings.map(w => `[${index}] ${w}`));
    });
    return { valid: errors.length === 0, errors, warnings };
  }

  // Vérifier le type
  if (!config.type) {
    errors.push('Missing required field: type');
    return { valid: false, errors, warnings };
  }

  const validTypes = [
    'text', 'list', 'grid', 'card', 'input', 'button', 
    'progress', 'stats', 'timeline', 'chart', 'layout'
  ];

  if (!validTypes.includes(config.type)) {
    errors.push(`Invalid type: ${config.type}. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validation spécifique par type
  switch (config.type) {
    case 'text':
      if (!config.content) {
        errors.push('text component requires content field');
      }
      break;

    case 'list':
      if (!config.items || !Array.isArray(config.items)) {
        errors.push('list component requires items array');
      } else if (config.items.length === 0) {
        warnings.push('list component has no items');
      }
      break;

    case 'grid':
      if (!config.columns || typeof config.columns !== 'number') {
        errors.push('grid component requires numeric columns field');
      }
      if (!config.children || !Array.isArray(config.children)) {
        errors.push('grid component requires children array');
      }
      break;

    case 'card':
      if (!config.content) {
        errors.push('card component requires content field');
      }
      break;

    case 'chart':
      if (!config.data || !Array.isArray(config.data)) {
        errors.push('chart component requires data array');
      }
      if (!config.chartType) {
        errors.push('chart component requires chartType field');
      }
      break;
  }

  // Valider les enfants récursivement
  if (config.children) {
    if (Array.isArray(config.children)) {
      config.children.forEach((child: any, index: number) => {
        const result = validateConfig(child);
        errors.push(...result.errors.map(e => `children[${index}] ${e}`));
        warnings.push(...result.warnings.map(w => `children[${index}] ${w}`));
      });
    }
  }

  if (config.content && typeof config.content === 'object') {
    if (Array.isArray(config.content)) {
      config.content.forEach((child: any, index: number) => {
        const result = validateConfig(child);
        errors.push(...result.errors.map(e => `content[${index}] ${e}`));
        warnings.push(...result.warnings.map(w => `content[${index}] ${w}`));
      });
    } else {
      const result = validateConfig(config.content);
      errors.push(...result.errors.map(e => `content: ${e}`));
      warnings.push(...result.warnings.map(w => `content: ${w}`));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ═══════════════════════════════════════════════════════
// TRANSFORMATION
// ═══════════════════════════════════════════════════════

/**
 * Nettoie et normalise une configuration JSON
 */
export function sanitizeConfig(config: any): ComponentConfig {
  if (Array.isArray(config)) {
    return config.map(sanitizeConfig) as any;
  }

  if (typeof config !== 'object' || config === null) {
    return config;
  }

  // Supprimer les champs undefined
  const cleaned: any = {};
  Object.keys(config).forEach(key => {
    if (config[key] !== undefined) {
      if (typeof config[key] === 'object') {
        cleaned[key] = sanitizeConfig(config[key]);
      } else {
        cleaned[key] = config[key];
      }
    }
  });

  return cleaned;
}

/**
 * Ajoute des IDs uniques si manquants
 */
export function ensureIds(config: ComponentConfig | ComponentConfig[]): ComponentConfig | ComponentConfig[] {
  if (Array.isArray(config)) {
    return config.map((c, i) => ensureIds({ ...c, id: c.id || `auto_${i}` }) as ComponentConfig);
  }

  const withId = { ...config, id: config.id || `auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` };

  // Récursif pour les enfants
  if ('children' in withId && Array.isArray(withId.children)) {
    withId.children = withId.children.map(c => ensureIds(c)) as any;
  }

  if ('content' in withId) {
    if (Array.isArray(withId.content)) {
      withId.content = withId.content.map(c => ensureIds(c)) as any;
    } else if (typeof withId.content === 'object') {
      withId.content = ensureIds(withId.content as any) as any;
    }
  }

  return withId as ComponentConfig;
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Compte le nombre de composants dans une config
 */
export function countComponents(config: ComponentConfig | ComponentConfig[]): number {
  if (Array.isArray(config)) {
    return config.reduce((sum, c) => sum + countComponents(c), 0);
  }

  let count = 1;

  if ('children' in config && Array.isArray(config.children)) {
    count += config.children.reduce((sum, c) => sum + countComponents(c as any), 0);
  }

  if ('content' in config) {
    if (Array.isArray(config.content)) {
      count += (config.content as any[]).reduce((sum, c) => sum + countComponents(c), 0);
    } else if (typeof config.content === 'object') {
      count += countComponents(config.content as any);
    }
  }

  return count;
}

/**
 * Extrait tous les types de composants utilisés
 */
export function extractTypes(config: ComponentConfig | ComponentConfig[]): Set<string> {
  const types = new Set<string>();

  function traverse(cfg: any) {
    if (Array.isArray(cfg)) {
      cfg.forEach(traverse);
      return;
    }

    if (typeof cfg === 'object' && cfg !== null) {
      if (cfg.type) types.add(cfg.type);
      if (cfg.children) traverse(cfg.children);
      if (cfg.content) traverse(cfg.content);
    }
  }

  traverse(config);
  return types;
}

/**
 * Calcule la profondeur maximale d'imbrication
 */
export function getMaxDepth(config: ComponentConfig | ComponentConfig[]): number {
  if (Array.isArray(config)) {
    return Math.max(...config.map(getMaxDepth), 0);
  }

  let maxChildDepth = 0;

  if ('children' in config && Array.isArray(config.children)) {
    maxChildDepth = Math.max(maxChildDepth, getMaxDepth(config.children as any));
  }

  if ('content' in config) {
    if (Array.isArray(config.content)) {
      maxChildDepth = Math.max(maxChildDepth, getMaxDepth(config.content as any));
    } else if (typeof config.content === 'object') {
      maxChildDepth = Math.max(maxChildDepth, getMaxDepth(config.content as any));
    }
  }

  return 1 + maxChildDepth;
}

// ═══════════════════════════════════════════════════════
// AI RESPONSE PARSING
// ═══════════════════════════════════════════════════════

/**
 * Parse une réponse de l'IA qui peut contenir du texte + JSON
 */
export function extractConfigFromAIResponse(response: string): ComponentConfig | null {
  try {
    // Cas 1: JSON pur
    return JSON.parse(response);
  } catch {
    // Cas 2: JSON dans des backticks markdown
    const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        console.error('Failed to parse JSON from markdown block');
      }
    }

    // Cas 3: Chercher le premier objet/array JSON valide
    const objectMatch = response.match(/\{[\s\S]*\}/);
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {}
    }
    
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {}
    }

    console.error('No valid JSON found in AI response');
    return null;
  }
}

/**
 * Génère un prompt optimisé pour Claude
 */
export function generateClaudePrompt(userQuery: string): string {
  return `Tu es un expert en génération d'interfaces utilisateur. Tu dois créer une configuration JSON pour le Dynamic Renderer System.

TYPES DE COMPOSANTS DISPONIBLES:
- text: Affichage de texte (title, subtitle, body, caption, code)
- list: Listes interactives (simple, detailed, numbered, checkable)
- grid: Layout en grille (spécifier columns)
- card: Conteneurs avec titre et actions
- input: Champs de saisie
- button: Boutons d'action
- progress: Barres de progression
- stats: Métriques et KPIs
- timeline: Chronologie d'événements
- chart: Graphiques (bar, line, pie, radar)
- layout: Containers flex (row, column)

RÈGLES IMPORTANTES:
1. Réponds UNIQUEMENT avec du JSON valide, pas de texte avant/après
2. Utilise des noms de propriétés exacts (type, content, children, etc.)
3. Assure-toi que tous les objets ont un champ 'type'
4. Les listes doivent avoir des 'items' avec 'id' et 'label'
5. Utilise des animations pour rendre l'UI vivante

REQUÊTE UTILISATEUR: "${userQuery}"

Génère maintenant la configuration JSON optimale:`;
}

// ═══════════════════════════════════════════════════════
// DEBUGGING
// ═══════════════════════════════════════════════════════

/**
 * Affiche une représentation lisible de la config dans la console
 */
export function debugConfig(config: ComponentConfig | ComponentConfig[]) {
  console.group('🧠 Dynamic Config Debug');
  console.log('Raw config:', config);
  console.log('Component count:', countComponents(config));
  console.log('Types used:', Array.from(extractTypes(config)));
  console.log('Max depth:', getMaxDepth(config));
  
  const validation = validateConfig(config);
  if (validation.errors.length > 0) {
    console.error('❌ Validation errors:', validation.errors);
  }
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Warnings:', validation.warnings);
  }
  if (validation.valid) {
    console.log('✅ Configuration is valid');
  }
  
  console.groupEnd();
}

/**
 * Génère un résumé textuel de la configuration
 */
export function summarizeConfig(config: ComponentConfig | ComponentConfig[]): string {
  const types = Array.from(extractTypes(config));
  const count = countComponents(config);
  const depth = getMaxDepth(config);
  
  return `Configuration with ${count} component(s), using types: ${types.join(', ')}. Max nesting depth: ${depth}.`;
}

// ═══════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════

export const ConfigUtils = {
  validate: validateConfig,
  sanitize: sanitizeConfig,
  ensureIds,
  countComponents,
  extractTypes,
  getMaxDepth,
  extractFromAI: extractConfigFromAIResponse,
  generatePrompt: generateClaudePrompt,
  debug: debugConfig,
  summarize: summarizeConfig,
};
