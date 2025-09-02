import express from 'express';
import { asyncHandler } from '../middleware/error.js';
import { validate, schemas } from '../middleware/validation.js';
import { logger } from '../lib/logger.js';
import { 
  getAllProducts, 
  getLocalizedProduct, 
  getProductsByCategory,
  getLocalizedCategory,
  CATEGORIES,
  PARTS
} from '../data/products.js';

const router = express.Router();

// Helper function to extract language from Accept-Language header or query
const getLanguageFromRequest = (req) => {
  // Check query parameter first
  if (req.query.lang && ['de', 'en', 'nl', 'th'].includes(req.query.lang)) {
    return req.query.lang;
  }
  
  // Parse Accept-Language header
  const acceptLanguage = req.get('Accept-Language') || 'de';
  const languages = acceptLanguage.split(',').map(lang => lang.trim().split(';')[0]);
  
  // Find first supported language
  const supportedLangs = ['de', 'en', 'nl', 'th'];
  for (const lang of languages) {
    if (supportedLangs.includes(lang)) {
      return lang;
    }
    // Check language prefix (e.g., 'en-US' -> 'en')
    const prefix = lang.split('-')[0];
    if (supportedLangs.includes(prefix)) {
      return prefix;
    }
  }
  
  return 'de'; // Default fallback
};

// GET /api/products - Get all products with localization
router.get('/', 
  validate(schemas.pagination, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, sortBy, sortOrder, category } = req.query;
    const language = getLanguageFromRequest(req);
    
    logger.info('Fetching products', { page, limit, sortBy, sortOrder, category, language });
    
    let products;
    
    if (category && category !== 'ALL') {
      products = getProductsByCategory(category, language);
    } else {
      products = getAllProducts(language);
    }
    
    // Basic filtering/sorting
    let filteredProducts = [...products];
    
    if (sortBy && sortBy === 'price') {
      filteredProducts.sort((a, b) => {
        const modifier = sortOrder === 'desc' ? -1 : 1;
        return (a.price - b.price) * modifier;
      });
    } else if (sortBy && sortBy === 'name') {
      filteredProducts.sort((a, b) => {
        const modifier = sortOrder === 'desc' ? -1 : 1;
        return a.name.localeCompare(b.name) * modifier;
      });
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + limit);
    
    res.json({
      success: true,
      data: {
        products: paginatedProducts,
        pagination: {
          page,
          limit,
          total: filteredProducts.length,
          pages: Math.ceil(filteredProducts.length / limit)
        },
        language
      }
    });
  })
);

// GET /api/products/categories - Get product categories with localization
router.get('/categories', asyncHandler(async (req, res) => {
  const language = getLanguageFromRequest(req);
  
  const categories = Object.keys(CATEGORIES).map(key => ({
    id: key,
    name: getLocalizedCategory(key, language),
    key: key
  }));
  
  res.json({
    success: true,
    data: { categories, language }
  });
}));

// GET /api/products/search - Search products with localization
router.get('/search',
  validate(schemas.pagination, 'query'),
  asyncHandler(async (req, res) => {
    const { q, category, page, limit } = req.query;
    const language = getLanguageFromRequest(req);
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: { message: 'Search query must be at least 2 characters' }
      });
    }
    
    logger.info('Searching products', { query: q, category, language });
    
    let products = getAllProducts(language);
    
    // Filter by category if specified
    if (category && category !== 'ALL') {
      products = products.filter(p => p.category === category);
    }
    
    // Search in name, description, and tech specs
    const searchTerm = q.toLowerCase();
    const matchingProducts = products.filter(product => {
      return product.name.toLowerCase().includes(searchTerm) ||
             (product.description && product.description.toLowerCase().includes(searchTerm)) ||
             (product.tech && product.tech.toLowerCase().includes(searchTerm)) ||
             product.categoryName.toLowerCase().includes(searchTerm);
    });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedProducts = matchingProducts.slice(startIndex, startIndex + limit);
    
    res.json({
      success: true,
      data: {
        products: paginatedProducts,
        pagination: {
          page,
          limit,
          total: matchingProducts.length,
          pages: Math.ceil(matchingProducts.length / limit)
        },
        query: q,
        language
      }
    });
  })
);

// GET /api/products/:id - Get single product with localization
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const language = getLanguageFromRequest(req);
  
  const product = getLocalizedProduct(id, language);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      error: { message: 'Product not found' }
    });
  }
  
  logger.info('Fetched product', { productId: id, language });
  
  res.json({
    success: true,
    data: { product, language }
  });
}));

// GET /api/products/category/:category - Get products by category with localization
router.get('/category/:category', 
  validate(schemas.pagination, 'query'),
  asyncHandler(async (req, res) => {
    const { category } = req.params;
    const { page, limit } = req.query;
    const language = getLanguageFromRequest(req);
    
    const products = getProductsByCategory(category, language);
    
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No products found in this category' }
      });
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedProducts = products.slice(startIndex, startIndex + limit);
    
    res.json({
      success: true,
      data: {
        products: paginatedProducts,
        pagination: {
          page,
          limit,
          total: products.length,
          pages: Math.ceil(products.length / limit)
        },
        category: {
          key: category,
          name: getLocalizedCategory(category, language)
        },
        language
      }
    });
  })
);

// POST /api/products/bulk - Get multiple products by IDs with localization
router.post('/bulk', asyncHandler(async (req, res) => {
  const { productIds } = req.body;
  const language = getLanguageFromRequest(req);
  
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: { message: 'productIds must be a non-empty array' }
    });
  }
  
  const products = productIds
    .map(id => getLocalizedProduct(id, language))
    .filter(product => product !== null);
  
  logger.info('Fetched bulk products', { 
    requested: productIds.length, 
    found: products.length, 
    language 
  });
  
  res.json({
    success: true,
    data: { 
      products, 
      language,
      requested: productIds.length,
      found: products.length
    }
  });
}));

export default router;