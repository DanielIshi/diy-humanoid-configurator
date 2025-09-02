import express from 'express';
import { ComponentRepository } from '../repositories/index.js';
import { asyncHandler } from '../middleware/error.js';
import { validate, schemas } from '../middleware/validation.js';
import { logger } from '../lib/logger.js';

const router = express.Router();
const componentRepository = new ComponentRepository();

// GET /api/components - Get all components with filtering
router.get('/', 
  validate(schemas.pagination, 'query'),
  asyncHandler(async (req, res) => {
    const { 
      page = 1, 
      limit = 20, 
      category, 
      availability, 
      difficulty, 
      search,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;
    
    logger.info('Fetching components', { 
      page, limit, category, availability, difficulty, search 
    });
    
    let components;
    const options = {
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: parseInt(limit),
    };

    // Apply filters based on query parameters
    if (search) {
      components = await componentRepository.searchComponents(search, options);
    } else if (category) {
      components = await componentRepository.findByCategory(category, options);
    } else if (availability) {
      components = await componentRepository.findAll({
        where: { availability },
        ...options,
      });
    } else if (difficulty) {
      components = await componentRepository.findByDifficulty(difficulty, options);
    } else {
      components = await componentRepository.findAll(options);
    }

    const total = await componentRepository.count(
      search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      } : category ? { category } : {}
    );
    
    res.json({
      success: true,
      data: {
        components,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

// POST /api/components - Create new component (Admin only)
router.post('/',
  // TODO: Add admin authentication middleware
  validate(schemas.createComponent, 'body'),
  asyncHandler(async (req, res) => {
    logger.info('Creating component', { name: req.body.name });
    
    const component = await componentRepository.createWithValidation(req.body);
    
    res.status(201).json({
      success: true,
      data: { component },
    });
  })
);

// GET /api/components/categories - Get component categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = [
    { id: 'HEAD', name: 'Head Units', description: 'Humanoid head components with sensors' },
    { id: 'TORSO', name: 'Torso Systems', description: 'Main body components and structure' },
    { id: 'ARMS', name: 'Arm Systems', description: 'Articulated arm components' },
    { id: 'LEGS', name: 'Leg Systems', description: 'Bipedal leg components and motors' },
    { id: 'SENSORS', name: 'Sensors', description: 'Various sensors and input devices' },
    { id: 'ACTUATORS', name: 'Actuators', description: 'Motors, servos, and actuators' },
    { id: 'ELECTRONICS', name: 'Electronics', description: 'Control boards, processors, and electronics' },
    { id: 'ACCESSORIES', name: 'Accessories', description: 'Additional components and tools' },
  ];
  
  res.json({
    success: true,
    data: { categories },
  });
}));

// GET /api/components/popular - Get popular components
router.get('/popular', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const components = await componentRepository.getPopularComponents(limit);
  
  res.json({
    success: true,
    data: { components },
  });
}));

// GET /api/components/:id - Get single component
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const component = await componentRepository.findById(id);
  
  if (!component) {
    return res.status(404).json({
      success: false,
      error: { message: 'Component not found' },
    });
  }
  
  logger.info('Fetched component', { componentId: id });
  
  res.json({
    success: true,
    data: { component },
  });
}));

// PUT /api/components/:id - Update component (Admin only)
router.put('/:id',
  // TODO: Add admin authentication middleware
  validate(schemas.updateComponent, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    logger.info('Updating component', { componentId: id });
    
    const component = await componentRepository.update(id, req.body);
    
    res.json({
      success: true,
      data: { component },
    });
  })
);

// DELETE /api/components/:id - Delete component (Admin only)
router.delete('/:id',
  // TODO: Add admin authentication middleware
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    logger.info('Deleting component', { componentId: id });
    
    await componentRepository.delete(id);
    
    res.json({
      success: true,
      message: 'Component deleted successfully',
    });
  })
);

// GET /api/components/category/:category - Get components by category
router.get('/category/:category', 
  validate(schemas.pagination, 'query'),
  asyncHandler(async (req, res) => {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const options = {
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { name: 'asc' },
    };
    
    const components = await componentRepository.findByCategory(category, options);
    const total = await componentRepository.count({ category });
    
    if (components.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'No components found in this category' },
      });
    }
    
    res.json({
      success: true,
      data: {
        components,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

// PATCH /api/components/:id/availability - Update component availability
router.patch('/:id/availability',
  // TODO: Add admin authentication middleware
  validate(schemas.updateAvailability, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { availability } = req.body;
    
    logger.info('Updating component availability', { componentId: id, availability });
    
    const component = await componentRepository.updateAvailability(id, availability);
    
    res.json({
      success: true,
      data: { component },
    });
  })
);

// PUT /api/components/:id/instructions - Update assembly instructions
router.put('/:id/instructions',
  // TODO: Add admin authentication middleware
  validate(schemas.updateInstructions, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { instructions, toolsRequired, timeEstimate } = req.body;
    
    logger.info('Updating component instructions', { componentId: id });
    
    const component = await componentRepository.updateInstructions(
      id, 
      instructions, 
      toolsRequired, 
      timeEstimate
    );
    
    res.json({
      success: true,
      data: { component },
    });
  })
);

// GET /api/components/time-estimate/:min/:max - Get components by time estimate range
router.get('/time-estimate/:min/:max',
  asyncHandler(async (req, res) => {
    const { min, max } = req.params;
    const minTime = parseInt(min);
    const maxTime = parseInt(max);
    
    if (isNaN(minTime) || isNaN(maxTime)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid time range parameters' },
      });
    }
    
    const components = await componentRepository.findComponentsWithTimeEstimate(minTime, maxTime);
    
    res.json({
      success: true,
      data: { components },
    });
  })
);

export default router;