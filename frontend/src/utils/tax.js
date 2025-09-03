/**
 * Tax calculation utilities for EU VAT compliance
 * Supports all EU countries with their respective VAT rates
 */

// EU VAT Rates (Stand: 2024)
export const TAX_RATES = {
  // DACH Region
  DE: 0.19,    // Deutschland 19%
  AT: 0.20,    // Österreich 20%
  CH: 0.077,   // Schweiz 7.7%
  
  // Benelux
  NL: 0.21,    // Niederlande 21%
  BE: 0.21,    // Belgien 21%
  LU: 0.17,    // Luxemburg 17%
  
  // Nordeuropa
  DK: 0.25,    // Dänemark 25%
  SE: 0.25,    // Schweden 25%
  NO: 0.25,    // Norwegen 25%
  FI: 0.24,    // Finnland 24%
  IS: 0.24,    // Island 24%
  
  // Westeuropa
  FR: 0.20,    // Frankreich 20%
  ES: 0.21,    // Spanien 21%
  PT: 0.23,    // Portugal 23%
  IT: 0.22,    // Italien 22%
  
  // Britische Inseln
  GB: 0.20,    // Großbritannien 20%
  IE: 0.23,    // Irland 23%
  
  // Osteuropa
  PL: 0.23,    // Polen 23%
  CZ: 0.21,    // Tschechien 21%
  SK: 0.20,    // Slowakei 20%
  HU: 0.27,    // Ungarn 27%
  SI: 0.22,    // Slowenien 22%
  HR: 0.25,    // Kroatien 25%
  
  // Südosteuropa
  RO: 0.19,    // Rumänien 19%
  BG: 0.20,    // Bulgarien 20%
  EE: 0.20,    // Estland 20%
  LV: 0.21,    // Lettland 21%
  LT: 0.21,    // Litauen 21%
  
  // Mediterran
  GR: 0.24,    // Griechenland 24%
  CY: 0.19,    // Zypern 19%
  MT: 0.18,    // Malta 18%
  
  // Außerhalb EU - Fallback 0%
  US: 0.0,     // USA - kein VAT
  CA: 0.0,     // Kanada - wird später durch HST/GST ersetzt
  AU: 0.10,    // Australien GST 10%
  JP: 0.10,    // Japan 10%
  OTHER: 0.0   // Standard Fallback
};

// EU Länder für Validierung
export const EU_COUNTRIES = new Set([
  'DE', 'AT', 'NL', 'BE', 'LU', 'DK', 'SE', 'FI', 'FR', 'ES', 'PT', 'IT',
  'IE', 'PL', 'CZ', 'SK', 'HU', 'SI', 'HR', 'RO', 'BG', 'EE', 'LV', 'LT',
  'GR', 'CY', 'MT'
]);

/**
 * Berechnet MwSt für einen gegebenen Preis und Land
 * @param {number} netPrice - Nettopreis (ohne MwSt)
 * @param {string} countryCode - ISO 3166-1 Alpha-2 Ländercode
 * @returns {Object} { net, vat, gross, vatRate, country }
 */
export function calculateVAT(netPrice, countryCode = 'DE') {
  if (!netPrice || isNaN(netPrice)) {
    throw new Error('Invalid price provided');
  }
  
  const country = countryCode.toUpperCase();
  const vatRate = TAX_RATES[country] || TAX_RATES.OTHER;
  const vat = netPrice * vatRate;
  const gross = netPrice + vat;
  
  return {
    net: parseFloat(netPrice.toFixed(2)),
    vat: parseFloat(vat.toFixed(2)),
    gross: parseFloat(gross.toFixed(2)),
    vatRate: vatRate,
    country: country,
    isEU: EU_COUNTRIES.has(country)
  };
}

/**
 * Berechnet Nettopreis aus Bruttopreis
 * @param {number} grossPrice - Bruttopreis (mit MwSt)
 * @param {string} countryCode - ISO 3166-1 Alpha-2 Ländercode
 * @returns {Object} { net, vat, gross, vatRate, country }
 */
export function calculateNetFromGross(grossPrice, countryCode = 'DE') {
  if (!grossPrice || isNaN(grossPrice)) {
    throw new Error('Invalid gross price provided');
  }
  
  const country = countryCode.toUpperCase();
  const vatRate = TAX_RATES[country] || TAX_RATES.OTHER;
  const net = grossPrice / (1 + vatRate);
  const vat = grossPrice - net;
  
  return {
    net: parseFloat(net.toFixed(2)),
    vat: parseFloat(vat.toFixed(2)),
    gross: parseFloat(grossPrice.toFixed(2)),
    vatRate: vatRate,
    country: country,
    isEU: EU_COUNTRIES.has(country)
  };
}

/**
 * Formatiert MwSt-Rate als Prozentsatz
 * @param {string} countryCode - ISO 3166-1 Alpha-2 Ländercode
 * @returns {string} Formatierte MwSt-Rate (z.B. "19%")
 */
export function getVATRateDisplay(countryCode = 'DE') {
  const country = countryCode.toUpperCase();
  const vatRate = TAX_RATES[country] || TAX_RATES.OTHER;
  return `${(vatRate * 100).toFixed(0)}%`;
}

/**
 * Prüft ob ein Land MwSt-pflichtig ist
 * @param {string} countryCode - ISO 3166-1 Alpha-2 Ländercode
 * @returns {boolean} True wenn MwSt anzuwenden ist
 */
export function hasVAT(countryCode = 'DE') {
  const country = countryCode.toUpperCase();
  const vatRate = TAX_RATES[country] || TAX_RATES.OTHER;
  return vatRate > 0;
}

/**
 * Ermittelt das Land basierend auf IP (Fallback Implementation)
 * In Produktion sollte dies durch einen echten GeoIP-Service ersetzt werden
 * @returns {Promise<string>} Ländercode
 */
export async function detectCountryByIP() {
  try {
    // Fallback auf deutschen Markt als Standard
    const response = await fetch('https://ipapi.co/country/', {
      timeout: 3000
    });
    
    if (response.ok) {
      const country = (await response.text()).trim().toUpperCase();
      return TAX_RATES[country] ? country : 'DE';
    }
  } catch (error) {
    console.warn('IP-basierte Ländererkennung fehlgeschlagen:', error);
  }
  
  // Fallback für lokale Entwicklung oder wenn Service nicht verfügbar
  return 'DE';
}

/**
 * Erstellt eine Steuer-Summary für eine Bestellung
 * @param {Array} items - Array von Items mit { price, quantity, countryCode? }
 * @param {string} defaultCountry - Standard-Ländercode
 * @returns {Object} Steuer-Zusammenfassung
 */
export function createTaxSummary(items = [], defaultCountry = 'DE') {
  let totalNet = 0;
  let totalVAT = 0;
  let totalGross = 0;
  const vatByRate = new Map();
  
  items.forEach(item => {
    if (!item.price || !item.quantity) return;
    
    const country = item.countryCode || defaultCountry;
    const itemTotal = item.price * item.quantity;
    const tax = calculateVAT(itemTotal, country);
    
    totalNet += tax.net;
    totalVAT += tax.vat;
    totalGross += tax.gross;
    
    // Gruppiere nach MwSt-Satz für detaillierte Aufschlüsselung
    const rateKey = `${tax.vatRate}_${tax.country}`;
    if (!vatByRate.has(rateKey)) {
      vatByRate.set(rateKey, {
        rate: tax.vatRate,
        country: tax.country,
        net: 0,
        vat: 0,
        gross: 0
      });
    }
    
    const rateGroup = vatByRate.get(rateKey);
    rateGroup.net += tax.net;
    rateGroup.vat += tax.vat;
    rateGroup.gross += tax.gross;
  });
  
  return {
    totalNet: parseFloat(totalNet.toFixed(2)),
    totalVAT: parseFloat(totalVAT.toFixed(2)),
    totalGross: parseFloat(totalGross.toFixed(2)),
    vatBreakdown: Array.from(vatByRate.values()).map(group => ({
      ...group,
      net: parseFloat(group.net.toFixed(2)),
      vat: parseFloat(group.vat.toFixed(2)),
      gross: parseFloat(group.gross.toFixed(2))
    })),
    currency: 'EUR' // Aktuell nur EUR unterstützt
  };
}

/**
 * Validiert eine MwSt-Nummer (vereinfachte Version)
 * @param {string} vatNumber - MwSt-Nummer
 * @param {string} countryCode - Ländercode
 * @returns {Object} Validierungsresultat
 */
export function validateVATNumber(vatNumber, countryCode = 'DE') {
  if (!vatNumber || typeof vatNumber !== 'string') {
    return { valid: false, error: 'VAT number is required' };
  }
  
  const cleaned = vatNumber.replace(/[\s\-\.]/g, '').toUpperCase();
  const country = countryCode.toUpperCase();
  
  // Basis-Validierung: Länderprefix + Nummer
  const patterns = {
    DE: /^DE[0-9]{9}$/,
    AT: /^ATU[0-9]{8}$/,
    NL: /^NL[0-9]{9}B[0-9]{2}$/,
    FR: /^FR[0-9A-Z]{2}[0-9]{9}$/,
    // Weitere Patterns können hinzugefügt werden
  };
  
  const pattern = patterns[country];
  if (!pattern) {
    return { valid: false, error: `VAT validation not supported for ${country}` };
  }
  
  const isValid = pattern.test(cleaned);
  return {
    valid: isValid,
    formatted: isValid ? cleaned : null,
    country: country,
    error: isValid ? null : 'Invalid VAT number format'
  };
}

// Hilfsfunktionen für React Komponenten
export const TaxUtils = {
  calculateVAT,
  calculateNetFromGross,
  getVATRateDisplay,
  hasVAT,
  detectCountryByIP,
  createTaxSummary,
  validateVATNumber,
  TAX_RATES,
  EU_COUNTRIES
};

export default TaxUtils;