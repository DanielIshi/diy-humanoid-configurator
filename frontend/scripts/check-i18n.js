/*
  Simple i18n consistency checker.
  - Scans frontend/src/locales/<lng>/{translation.json,products.json}
  - Verifies all locales contain the same set of keys (deep keys)
  - Prints a report and exits with non-zero code if differences found
*/

import fs from 'fs';
import path from 'path';

const localesDir = path.resolve(process.cwd(), 'src', 'locales');
const filesToCheck = ['translation.json', 'products.json'];

function readJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function flattenKeys(obj, prefix = '') {
  const keys = [];
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const newPrefix = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        keys.push(...flattenKeys(v, newPrefix));
      } else {
        keys.push(newPrefix);
      }
    }
  }
  return keys;
}

function main() {
  const langs = fs.readdirSync(localesDir).filter((f) => fs.statSync(path.join(localesDir, f)).isDirectory());
  if (langs.length === 0) {
    console.log('No locales found.');
    process.exit(0);
  }

  let hasErrors = false;

  for (const fileName of filesToCheck) {
    const map = new Map();
    for (const lang of langs) {
      const filePath = path.join(localesDir, lang, fileName);
      const json = readJSON(filePath) || {};
      map.set(lang, new Set(flattenKeys(json)));
    }

    // Union of all keys across locales
    const union = new Set();
    for (const set of map.values()) {
      for (const k of set) union.add(k);
    }

    const missingReport = [];
    for (const [lang, set] of map.entries()) {
      const missing = [...union].filter((k) => !set.has(k));
      if (missing.length) {
        hasErrors = true;
        missingReport.push({ lang, count: missing.length, missing });
      }
    }

    if (missingReport.length) {
      console.log(`\n[i18n] Missing keys in ${fileName}:`);
      for (const entry of missingReport) {
        console.log(`- ${entry.lang}: ${entry.count} keys`);
        // Print up to first 20 missing keys for brevity
        entry.missing.slice(0, 20).forEach((k) => console.log(`  • ${k}`));
        if (entry.missing.length > 20) console.log(`  …and ${entry.missing.length - 20} more`);
      }
    } else {
      console.log(`[i18n] ${fileName}: OK (all locales aligned)`);
    }
  }

  process.exit(hasErrors ? 1 : 0);
}

main();

