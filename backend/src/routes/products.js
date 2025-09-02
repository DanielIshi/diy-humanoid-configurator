import express from 'express';
import { asyncHandler } from '../middleware/error.js';
import { validate, schemas } from '../middleware/validation.js';
import { logger } from '../lib/logger.js';

const router = express.Router();

// Mock product data (replace with database later)
const mockProducts = {
  'head-basic': {
    id: 'head-basic',
    name: 'Basic Head Unit',
    category: 'head',
    price: 299.99,
    description: 'Basic humanoid head with LCD display',
    specifications: {
      display: '5-inch LCD',
      weight: '1.2kg',
      materials: ['ABS Plastic', 'Aluminum'],
    },
    availability: 'in-stock',
    imageUrl: '/images/head-basic.jpg'
  },
  'torso-standard': {
    id: 'torso-standard',
    name: 'Standard Torso',
    category: 'torso',
    price: 599.99,
    description: 'Standard torso unit with servo motors',
    specifications: {
      servos: '6x Digital Servos',
      weight: '3.5kg',
      materials: ['Carbon Fiber', 'Aluminum'],
    },
    availability: 'in-stock',
    imageUrl: '/images/torso-standard.jpg'
  },
  'arm-articulated': {
    id: 'arm-articulated',
    name: 'Articulated Arm (Pair)',
    category: 'arms',
    price: 399.99,
    description: 'Fully articulated arm pair with 7 DOF each',
    specifications: {
      dof: '7 per arm',
      weight: '2.1kg per arm',
      materials: ['Aluminum', 'Steel'],
    },
    availability: 'in-stock',
    imageUrl: '/images/arm-articulated.jpg'
  },
  'leg-bipedal': {
    id: 'leg-bipedal',
    name: 'Bipedal Legs (Pair)',
    category: 'legs',
    price: 799.99,
    description: 'Bipedal leg system with balance control',
    specifications: {
      dof: '6 per leg',
      weight: '4.2kg per leg',
      materials: ['Titanium', 'Carbon Fiber'],
    },
    availability: 'low-stock',
    imageUrl: '/images/leg-bipedal.jpg'
  }
};

// GET /api/products - Get all products
router.get('/', 
  validate(schemas.pagination, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, sortBy, sortOrder } = req.query;
    
    logger.info('Fetching products', { page, limit, sortBy, sortOrder });
    
    // Mock implementation - replace with database query
    const products = Object.values(mockProducts);
    
    // Basic filtering/sorting
    let filteredProducts = [...products];
    
    if (sortBy && sortBy === 'price') {
      filteredProducts.sort((a, b) => {
        const modifier = sortOrder === 'desc' ? -1 : 1;
        return (a.price - b.price) * modifier;
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
          total: products.length,
          pages: Math.ceil(products.length / limit)
        }
      }
    });
  })
);

// GET /api/products/categories - Get product categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = [
    { id: 'head', name: 'Head Units', description: 'Humanoid head components' },
    { id: 'torso', name: 'Torso Systems', description: 'Main body components' },
    { id: 'arms', name: 'Arm Systems', description: 'Articulated arm components' },
    { id: 'legs', name: 'Leg Systems', description: 'Bipedal leg components' },
    { id: 'accessories', name: 'Accessories', description: 'Additional components' }
  ];
  
  res.json({
    success: true,
    data: { categories }
  });
}));

// GET /api/products/:id - Get single product
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const product = mockProducts[id];
  
  if (!product) {
    return res.status(404).json({
      success: false,
      error: { message: 'Product not found' }
    });
  }
  
  logger.info('Fetched product', { productId: id });
  
  res.json({
    success: true,
    data: { product }
  });
}));

// GET /api/products/category/:category - Get products by category
router.get('/category/:category', 
  validate(schemas.pagination, 'query'),
  asyncHandler(async (req, res) => {
    const { category } = req.params;
    const { page, limit } = req.query;
    
    const products = Object.values(mockProducts).filter(p => p.category === category);
    
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
        }
      }
    });
  })
);

export default router;