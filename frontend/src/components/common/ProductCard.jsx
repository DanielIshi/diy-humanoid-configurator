import { useTranslation } from 'react-i18next';
import { 
  getLocalizedProductName,
  getLocalizedProductDescription,
  getLocalizedCategoryName,
  getLocalizedUnit 
} from '../../utils/data.js';
import { currency } from '../../utils/helpers.js';
import Tooltip from '../shared/Tooltip';

function ProductCard({ 
  productKey, 
  product, 
  quantity = 0, 
  onQuantityChange, 
  onAddToCart, 
  showDescription = true,
  showTechnicalSpecs = true,
  className = "" 
}) {
  const { t } = useTranslation('products');

  const localizedName = getLocalizedProductName(productKey, t);
  const localizedDescription = getLocalizedProductDescription(productKey, t);
  const localizedCategory = getLocalizedCategoryName(product.category, t);
  const localizedUnit = getLocalizedUnit(product.unit, t);

  const handleQuantityChange = (e) => {
    const newQty = Math.max(0, Math.round(Number(e.target.value) || 0));
    onQuantityChange?.(productKey, newQty);
  };

  const handleAddToCart = () => {
    onAddToCart?.(productKey, 1);
  };

  return (
    <div className={`bg-[#0b1328] border border-slate-700/60 rounded-xl p-4 hover:border-slate-600/80 transition-colors ${className}`}>
      {/* Header mit Kategorie-Badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
              {localizedCategory}
            </span>
          </div>
          
          <h3 className="font-medium text-white flex items-center gap-2">
            {localizedName}
            {showTechnicalSpecs && product.tech && (
              <Tooltip label={product.tech} />
            )}
          </h3>
          
          {showDescription && localizedDescription && (
            <p className="text-sm text-slate-400 mt-1">
              {localizedDescription}
            </p>
          )}
        </div>
      </div>

      {/* Preis und Link */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-lg font-semibold text-emerald-400">
          {currency(product.price)}
          <span className="text-xs text-slate-400 ml-1">/ {localizedUnit}</span>
        </div>
        
        {product.link && product.link !== "#" && (
          <a 
            href={product.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-indigo-300 hover:text-indigo-200 hover:underline"
          >
            {t('common.productLink', 'Produkt ansehen')}
          </a>
        )}
      </div>

      {/* Quantity Controls */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <label className="text-sm text-slate-300" htmlFor={`qty-${productKey}`}>
            {t('common.quantity', 'Menge')}:
          </label>
          <input 
            id={`qty-${productKey}`}
            type="number" 
            min="0"
            step="1"
            className="w-20 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500" 
            value={quantity} 
            onChange={handleQuantityChange}
          />
        </div>
        
        {onAddToCart && (
          <button 
            onClick={handleAddToCart}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
          >
            {t('common.add', 'Hinzufügen')}
          </button>
        )}
      </div>

      {/* Gesamtpreis bei Menge > 0 */}
      {quantity > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700/60">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">
              {quantity} × {currency(product.price)}
            </span>
            <span className="font-semibold text-white">
              {currency(product.price * quantity)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductCard;