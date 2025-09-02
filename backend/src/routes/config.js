import express from 'express';
import { asyncHandler } from '../middleware/error.js';
import { validate, schemas } from '../middleware/validation.js';
import { logger } from '../lib/logger.js';

const router = express.Router();

// Mock configuration storage (replace with database later)
let savedConfigurations = {
  'config-1': {
    id: 'config-1',
    name: 'My First Humanoid',
    description: 'Basic configuration for learning',
    components: {
      head: {
        id: 'head-basic',
        name: 'Basic Head Unit',
        type: 'head',
        price: 299.99
      },
      torso: {
        id: 'torso-standard',
        name: 'Standard Torso',
        type: 'torso',
        price: 599.99
      }
    },
    totalPrice: 899.98,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    metadata: {
      tags: ['beginner', 'basic'],
      public: false
    }
  }
};

// GET /api/config - Get all user configurations
router.get('/', asyncHandler(async (req, res) => {
  // In production, filter by authenticated user
  const configs = Object.values(savedConfigurations);
  
  logger.info('Fetched configurations', { count: configs.length });
  
  res.json({
    success: true,
    data: { configurations: configs }
  });
}));

// GET /api/config/:id - Get specific configuration
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const config = savedConfigurations[id];
  
  if (!config) {
    return res.status(404).json({
      success: false,
      error: { message: 'Configuration not found' }
    });
  }
  
  logger.info('Fetched configuration', { configId: id });
  
  res.json({
    success: true,
    data: { configuration: config }
  });
}));

// POST /api/config - Save new configuration
router.post('/',
  validate(schemas.saveConfiguration),
  asyncHandler(async (req, res) => {
    const configData = req.body;
    
    // Generate unique ID (use UUID in production)
    const configId = `config-${Date.now()}`;
    
    const newConfig = {
      id: configId,
      ...configData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Save to mock storage
    savedConfigurations[configId] = newConfig;
    
    logger.info('Saved new configuration', { 
      configId,
      name: configData.name,
      totalPrice: configData.totalPrice
    });
    
    res.status(201).json({
      success: true,
      data: { configuration: newConfig }
    });
  })
);

// PUT /api/config/:id - Update existing configuration
router.put('/:id',
  validate(schemas.saveConfiguration),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const configData = req.body;
    
    const existingConfig = savedConfigurations[id];
    
    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        error: { message: 'Configuration not found' }
      });
    }
    
    // Update configuration
    const updatedConfig = {
      ...existingConfig,
      ...configData,
      id: existingConfig.id, // Preserve original ID
      createdAt: existingConfig.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
    };
    
    savedConfigurations[id] = updatedConfig;
    
    logger.info('Updated configuration', {
      configId: id,
      name: configData.name
    });
    
    res.json({
      success: true,
      data: { configuration: updatedConfig }
    });
  })
);

// DELETE /api/config/:id - Delete configuration
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const existingConfig = savedConfigurations[id];
  
  if (!existingConfig) {
    return res.status(404).json({
      success: false,
      error: { message: 'Configuration not found' }
    });
  }
  
  delete savedConfigurations[id];
  
  logger.info('Deleted configuration', { configId: id });
  
  res.json({
    success: true,
    data: { message: 'Configuration deleted successfully' }
  });
}));

// POST /api/config/:id/duplicate - Duplicate existing configuration
router.post('/:id/duplicate', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const originalConfig = savedConfigurations[id];
  
  if (!originalConfig) {
    return res.status(404).json({
      success: false,
      error: { message: 'Configuration not found' }
    });
  }
  
  // Create duplicate with new ID and name
  const duplicateId = `config-${Date.now()}`;
  const duplicateConfig = {
    ...originalConfig,
    id: duplicateId,
    name: `${originalConfig.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  savedConfigurations[duplicateId] = duplicateConfig;
  
  logger.info('Duplicated configuration', {
    originalId: id,
    duplicateId
  });
  
  res.status(201).json({
    success: true,
    data: { configuration: duplicateConfig }
  });
}));

export default router;