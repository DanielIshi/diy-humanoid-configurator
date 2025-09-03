import { useEffect, useState } from 'react';
import { PARTS } from './data.js';

// Utility Functions
export const currency = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);

export const sumEK = (items) => Object.entries(items).reduce((s, [k, q]) => s + (PARTS[k].price * q), 0);

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// Custom Hook für localStorage
export const useLocalStorage = (key, initial) => {
  const [v, setV] = useState(() => {
    try { 
      const raw = localStorage.getItem(key); 
      return raw ? JSON.parse(raw) : initial; 
    } catch { 
      return initial; 
    }
  });

  useEffect(() => { 
    try { 
      localStorage.setItem(key, JSON.stringify(v)); 
    } catch {} 
  }, [key, v]);

  return [v, setV];
};

// CSV Export Helper (Customer-facing, no EK/VK data)
export const exportCSV = (items, retailTotal, retailForPartFn) => {
  const rows = [["Komponente","Menge","Einheit","Einzelpreis","Gesamtpreis","Link"]];
  
  Object.entries(items).forEach(([k, qty]) => {
    if (!qty) return;
    const p = PARTS[k];
    const unitPrice = retailForPartFn(k);
    rows.push([
      p.name, 
      String(qty), 
      p.unit, 
      unitPrice.toFixed(2) + " EUR", 
      (unitPrice * qty).toFixed(2) + " EUR", 
      p.link
    ]);
  });
  
  rows.push(["GESAMTPREIS","","","", retailTotal.toFixed(2) + " EUR",""]);
  
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], {type: "text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob); 
  const a = document.createElement('a'); 
  a.href = url; 
  a.download = 'humanoid_parts_list.csv'; 
  a.click(); 
  URL.revokeObjectURL(url);
};