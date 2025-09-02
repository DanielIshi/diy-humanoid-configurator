/**
 * Backend Produktübersetzungs-Utilities
 * Erweitert Produktdaten um lokalisierte Namen und Beschreibungen basierend auf Accept-Language Header
 */

import { translateResponse } from '../i18n/index.js';

/**
 * Übersetzt einen einzelnen Produktnamen
 * @param {string} productKey - Der Produktschlüssel (z.B. 'MG996R')
 * @param {string} fallbackName - Fallback-Name falls keine Übersetzung gefunden wird
 * @param {string} language - Sprachcode (z.B. 'de', 'en')
 * @returns {string} Der übersetzte Produktname
 */
export function translateProductName(productKey, fallbackName, language = 'de') {
  try {
    const translationKey = `products:products.${productKey}.name`;
    const translated = translateResponse(translationKey, {}, language);
    
    // Wenn die Übersetzung den Key zurückgibt, ist keine Übersetzung vorhanden
    if (translated === translationKey) {
      return fallbackName;
    }
    
    return translated;
  } catch (error) {
    console.warn(`Translation failed for product ${productKey}:`, error.message);
    return fallbackName;
  }
}

/**
 * Übersetzt eine Produktbeschreibung
 * @param {string} productKey - Der Produktschlüssel
 * @param {string} fallbackDescription - Fallback-Beschreibung
 * @param {string} language - Sprachcode
 * @returns {string} Die übersetzte Beschreibung
 */
export function translateProductDescription(productKey, fallbackDescription, language = 'de') {
  try {
    const translationKey = `products:products.${productKey}.description`;
    const translated = translateResponse(translationKey, {}, language);
    
    if (translated === translationKey) {
      return fallbackDescription || '';
    }
    
    return translated;
  } catch (error) {
    console.warn(`Description translation failed for product ${productKey}:`, error.message);
    return fallbackDescription || '';
  }
}

/**
 * Übersetzt technische Spezifikationen
 * @param {string} productKey - Der Produktschlüssel
 * @param {string} fallbackTech - Fallback-Spezifikation
 * @param {string} language - Sprachcode
 * @returns {string} Die übersetzten technischen Daten
 */
export function translateProductTech(productKey, fallbackTech, language = 'de') {
  try {
    const translationKey = `products:products.${productKey}.tech`;
    const translated = translateResponse(translationKey, {}, language);
    
    if (translated === translationKey) {
      return fallbackTech || '';
    }
    
    return translated;
  } catch (error) {
    console.warn(`Tech translation failed for product ${productKey}:`, error.message);
    return fallbackTech || '';
  }
}

/**
 * Übersetzt eine Kategorie
 * @param {string} categoryKey - Der Kategorieschlüssel (z.B. 'SERVO')
 * @param {string} language - Sprachcode
 * @returns {string} Die übersetzte Kategorie
 */
export function translateCategory(categoryKey, language = 'de') {
  try {
    const translationKey = `products:categories.${categoryKey}`;
    const translated = translateResponse(translationKey, {}, language);
    
    if (translated === translationKey) {
      return categoryKey;
    }
    
    return translated;
  } catch (error) {
    console.warn(`Category translation failed for ${categoryKey}:`, error.message);
    return categoryKey;
  }
}

/**
 * Übersetzt eine Einheit
 * @param {string} unitKey - Der Einheitsschlüssel
 * @param {string} language - Sprachcode
 * @returns {string} Die übersetzte Einheit
 */
export function translateUnit(unitKey, language = 'de') {
  try {
    const translationKey = `products:units.${unitKey}`;
    const translated = translateResponse(translationKey, {}, language);
    
    if (translated === translationKey) {
      return unitKey;
    }
    
    return translated;
  } catch (error) {
    console.warn(`Unit translation failed for ${unitKey}:`, error.message);
    return unitKey;
  }
}

/**
 * Erweitert ein Produktobjekt um lokalisierte Felder
 * @param {Object} product - Das ursprüngliche Produktobjekt
 * @param {string} language - Sprachcode für die Übersetzung
 * @returns {Object} Das erweiterte Produkt mit lokalisierten Feldern
 */
export function localizeProduct(product, language = 'de') {
  if (!product) return product;

  const productKey = product.id || product.code || product.translation_key;
  
  return {
    ...product,
    localizedName: translateProductName(productKey, product.name, language),
    localizedDescription: translateProductDescription(productKey, product.description, language),
    localizedTech: translateProductTech(productKey, product.tech_specs || product.technical_specs, language),
    localizedCategory: translateCategory(product.category, language),
    localizedUnit: translateUnit(product.unit, language)
  };
}

/**
 * Erweitert eine Liste von Produkten um lokalisierte Felder
 * @param {Array} products - Array von Produktobjekten
 * @param {string} language - Sprachcode für die Übersetzung
 * @returns {Array} Array mit lokalisierten Produkten
 */
export function localizeProducts(products, language = 'de') {
  if (!Array.isArray(products)) return products;
  
  return products.map(product => localizeProduct(product, language));
}

/**
 * Express Middleware um Produktantworten automatisch zu lokalisieren
 * Fügt lokalisierte Felder zu Produktdaten in der Response hinzu
 */
export function productLocalizationMiddleware(req, res, next) {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Prüfe ob die Response Produktdaten enthält
    if (data && typeof data === 'object') {
      const language = req.language || 'de';
      
      // Einzelnes Produkt
      if (data.product) {
        data.product = localizeProduct(data.product, language);
      }
      
      // Array von Produkten
      if (data.products && Array.isArray(data.products)) {
        data.products = localizeProducts(data.products, language);
      }
      
      // Direkte Produktliste
      if (Array.isArray(data) && data.length > 0 && data[0].name) {
        data = localizeProducts(data, language);
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Hilfsfunktion für Preset-Übersetzungen
 * @param {string} presetKey - Der Preset-Schlüssel
 * @param {string} field - Das Feld ('label' oder 'description')
 * @param {string} fallback - Fallback-Wert
 * @param {string} language - Sprachcode
 * @returns {string} Die übersetzte Preset-Information
 */
export function translatePreset(presetKey, field = 'label', fallback = '', language = 'de') {
  try {
    const translationKey = `products:presets.${presetKey}.${field}`;
    const translated = translateResponse(translationKey, {}, language);
    
    if (translated === translationKey) {
      return fallback;
    }
    
    return translated;
  } catch (error) {
    console.warn(`Preset translation failed for ${presetKey}.${field}:`, error.message);
    return fallback;
  }
}

export default {
  translateProductName,
  translateProductDescription,
  translateProductTech,
  translateCategory,
  translateUnit,
  translatePreset,
  localizeProduct,
  localizeProducts,
  productLocalizationMiddleware
};