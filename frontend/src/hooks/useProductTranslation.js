import { useTranslation } from 'react-i18next';

/**
 * Hook für die Übersetzung von Produktinformationen
 * Übersetzt Produktnamen, Kategorien und Eigenschaften basierend auf der aktuellen Sprache
 */
export const useProductTranslation = () => {
  const { t, i18n } = useTranslation(['products', 'translation']);

  /**
   * Übersetzt den Namen eines Produkts basierend auf seinem translation_key
   * @param {string} translationKey - Der Übersetzungsschlüssel des Produkts
   * @param {string} fallbackName - Fallback-Name falls keine Übersetzung gefunden wird
   * @returns {string} Der übersetzte Produktname oder der Fallback
   */
  const translateProductName = (translationKey, fallbackName = '') => {
    if (!translationKey) return fallbackName;
    
    const translatedName = t(`products:products.${translationKey}.name`);
    
    // Wenn die Übersetzung den Key zurückgibt, ist keine Übersetzung vorhanden
    if (translatedName === `products.${translationKey}.name`) {
      return fallbackName || translationKey;
    }
    
    return translatedName;
  };

  /**
   * Übersetzt die Beschreibung eines Produkts
   * @param {string} translationKey - Der Übersetzungsschlüssel des Produkts
   * @param {string} fallbackDescription - Fallback-Beschreibung
   * @returns {string} Die übersetzte Beschreibung oder der Fallback
   */
  const translateProductDescription = (translationKey, fallbackDescription = '') => {
    if (!translationKey) return fallbackDescription;
    
    const translatedDesc = t(`products:products.${translationKey}.description`);
    
    if (translatedDesc === `products.${translationKey}.description`) {
      return fallbackDescription || '';
    }
    
    return translatedDesc;
  };

  /**
   * Übersetzt technische Spezifikationen eines Produkts
   * @param {string} translationKey - Der Übersetzungsschlüssel des Produkts
   * @param {string} fallbackTech - Fallback technische Spezifikation
   * @returns {string} Die übersetzten technischen Daten oder der Fallback
   */
  const translateProductTech = (translationKey, fallbackTech = '') => {
    if (!translationKey) return fallbackTech;
    
    const translatedTech = t(`products:products.${translationKey}.tech`);
    
    if (translatedTech === `products.${translationKey}.tech`) {
      return fallbackTech || '';
    }
    
    return translatedTech;
  };

  /**
   * Übersetzt eine Produktkategorie
   * @param {string} categoryKey - Der Kategorieschlüssel (z.B. 'SERVO', 'CONTROLLER')
   * @returns {string} Die übersetzte Kategorie
   */
  const translateCategory = (categoryKey) => {
    if (!categoryKey) return categoryKey;
    
    const translatedCategory = t(`products:categories.${categoryKey}`);
    
    if (translatedCategory === `categories.${categoryKey}`) {
      return categoryKey;
    }
    
    return translatedCategory;
  };

  /**
   * Übersetzt Produkteigenschaften (z.B. 'waterproof', 'lightweight')
   * @param {string} propertyKey - Der Eigenschaftsschlüssel
   * @returns {string} Die übersetzte Eigenschaft
   */
  const translateProperty = (propertyKey) => {
    if (!propertyKey) return propertyKey;
    
    const translatedProperty = t(`products:properties.${propertyKey}`);
    
    if (translatedProperty === `properties.${propertyKey}`) {
      return propertyKey;
    }
    
    return translatedProperty;
  };

  /**
   * Übersetzt Einheiten (z.B. 'piece', 'set', 'kilogram')
   * @param {string} unitKey - Der Einheitsschlüssel
   * @returns {string} Die übersetzte Einheit
   */
  const translateUnit = (unitKey) => {
    if (!unitKey) return unitKey;
    
    const translatedUnit = t(`products:units.${unitKey}`);
    
    if (translatedUnit === `units.${unitKey}`) {
      return unitKey;
    }
    
    return translatedUnit;
  };

  /**
   * Übersetzt Preset-Informationen
   * @param {string} presetKey - Der Preset-Schlüssel
   * @param {string} field - Das Feld ('label' oder 'description')
   * @returns {string} Die übersetzte Preset-Information
   */
  const translatePreset = (presetKey, field = 'label') => {
    if (!presetKey || !field) return presetKey;
    
    const translatedPreset = t(`products:presets.${presetKey}.${field}`);
    
    if (translatedPreset === `presets.${presetKey}.${field}`) {
      return presetKey;
    }
    
    return translatedPreset;
  };

  /**
   * Komplette Produktübersetzung - übersetzt alle verfügbaren Felder eines Produkts
   * @param {Object} product - Das Produktobjekt
   * @returns {Object} Das Produkt mit übersetzten Feldern
   */
  const translateProduct = (product) => {
    if (!product) return product;

    const translationKey = product.translation_key || product.id || product.code;
    
    return {
      ...product,
      translatedName: translateProductName(translationKey, product.name),
      translatedDescription: translateProductDescription(translationKey, product.description),
      translatedTech: translateProductTech(translationKey, product.tech_specs),
      translatedCategory: translateCategory(product.category),
      translatedUnit: translateUnit(product.unit)
    };
  };

  /**
   * Übersetzt eine Liste von Produkten
   * @param {Array} products - Array von Produktobjekten
   * @returns {Array} Array mit übersetzten Produkten
   */
  const translateProducts = (products) => {
    if (!Array.isArray(products)) return products;
    
    return products.map(product => translateProduct(product));
  };

  /**
   * Gibt die aktuelle Sprache zurück
   * @returns {string} Der aktuelle Sprachcode (z.B. 'de', 'en')
   */
  const getCurrentLanguage = () => {
    return i18n.language;
  };

  /**
   * Prüft ob eine Übersetzung für einen bestimmten Key existiert
   * @param {string} key - Der Übersetzungskey
   * @param {string} namespace - Der Namespace (standardmäßig 'products')
   * @returns {boolean} true wenn Übersetzung existiert
   */
  const hasTranslation = (key, namespace = 'products') => {
    return i18n.exists(`${namespace}:${key}`);
  };

  return {
    translateProductName,
    translateProductDescription,
    translateProductTech,
    translateCategory,
    translateProperty,
    translateUnit,
    translatePreset,
    translateProduct,
    translateProducts,
    getCurrentLanguage,
    hasTranslation,
    // Direkte Übersetzungsfunktion für erweiterte Nutzung
    t
  };
};

export default useProductTranslation;