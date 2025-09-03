import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  getProductsByCategory,
  getLocalizedCategoryName,
  searchProducts
} from '../../utils/data.js';
import ProductCard from './ProductCard';

function ProductCatalog({ 
  selectedItems = {}, 
  onQuantityChange,
  onAddToCart,
  showSearch = true,
  showCategoryFilter = true,
  showDescriptions = true,
  className = ""
}) {
  const { t } = useTranslation(['translation', 'products']);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const productsByCategory = useMemo(() => getProductsByCategory(), []);
  const categories = Object.keys(productsByCategory);

  const filteredProducts = useMemo(() => {
    let productKeys = searchProducts(searchTerm, t);
    
    if (selectedCategory !== 'ALL') {
      productKeys = productKeys.filter(key => {
        const category = productsByCategory[selectedCategory]?.find(p => p.key === key);
        return category !== undefined;
      });
    }
    
    return productKeys;
  }, [searchTerm, selectedCategory, productsByCategory, t]);

  const groupedFilteredProducts = useMemo(() => {
    const grouped = {};
    
    filteredProducts.forEach(productKey => {
      Object.entries(productsByCategory).forEach(([category, products]) => {
        const product = products.find(p => p.key === productKey);
        if (product) {
          if (!grouped[category]) {
            grouped[category] = [];
          }
          grouped[category].push(product);
        }
      });
    });
    
    return grouped;
  }, [filteredProducts, productsByCategory]);

  return (
    <div data-testid="product-catalog" className={`space-y-6 ${className}`}>
      {/* Search and Filter Controls */}
      <div className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          {showSearch && (
            <div className="flex-1">
              <label htmlFor="product-search" className="block text-sm font-medium text-slate-300 mb-2">
                {t('translation:common.search', 'Suchen')}
              </label>
              <input
                id="product-search"
                type="text"
                placeholder={t('translation:common.searchPlaceholder', 'Produktname, Kategorie oder Spezifikation...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              />
            </div>
          )}

          {/* Category Filter */}
          {showCategoryFilter && (
            <div className="md:w-64">
              <label htmlFor="category-filter" className="block text-sm font-medium text-slate-300 mb-2">
                {t('translation:common.category', 'Kategorie')}
              </label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
              >
                <option value="ALL">{t('translation:common.allCategories', 'Alle Kategorien')}</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {getLocalizedCategoryName(category, t)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mt-4 text-sm text-slate-400">
          {filteredProducts.length === 0 ? (
            t('translation:common.noResults', 'Keine Produkte gefunden')
          ) : (
            t('translation:common.resultCount', '{{count}} Produkte gefunden', { count: filteredProducts.length })
          )}
        </div>
      </div>

      {/* Product Grid by Categories */}
      {Object.entries(groupedFilteredProducts).map(([categoryKey, products]) => (
        <div key={categoryKey} className="bg-[#0e1630] rounded-2xl p-5 border border-slate-700/60">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
            {getLocalizedCategoryName(categoryKey, t)}
            <span className="text-sm text-slate-400">({products.length})</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map(product => (
              <ProductCard
                key={product.key}
                productKey={product.key}
                product={product}
                quantity={selectedItems[product.key] || 0}
                onQuantityChange={onQuantityChange}
                onAddToCart={onAddToCart}
                showDescription={showDescriptions}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {Object.keys(groupedFilteredProducts).length === 0 && (
        <div className="bg-[#0e1630] rounded-2xl p-12 border border-slate-700/60 text-center">
          <div className="text-slate-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {t('translation:common.noProductsFound', 'Keine Produkte gefunden')}
          </h3>
          <p className="text-slate-400">
            {t('translation:common.tryDifferentSearch', 'Versuchen Sie andere Suchbegriffe oder wählen Sie eine andere Kategorie.')}
          </p>
        </div>
      )}
    </div>
  );
}

export default ProductCatalog;
