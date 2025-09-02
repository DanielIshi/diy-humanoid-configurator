import express from 'express';
import { ConfigurationRepository } from '../repositories/index.js';
import { asyncHandler } from '../middleware/error.js';
import { validate, schemas } from '../middleware/validation.js';
import { logger } from '../lib/logger.js';

const router = express.Router();
const configurationRepository = new ConfigurationRepository();

// GET /api/configurations - Get configurations with filtering
router.get('/', 
  validate(schemas.pagination, 'query'),
  asyncHandler(async (req, res) => {
    const { 
      page = 1, 
      limit = 20, 
      userId, 
      isPublic, 
      search,
      tags,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;
    
    logger.info('Fetching configurations', { 
      page, limit, userId, isPublic, search 
    });
    
    let configurations;
    const options = {
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: parseInt(limit),
    };

    if (search) {
      configurations = await configurationRepository.searchConfigurations(search, options);
    } else if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      configurations = await configurationRepository.findByTags(tagArray, options);
    } else if (userId) {
      configurations = await configurationRepository.findByUser(userId, options);
    } else if (isPublic === 'true') {
      configurations = await configurationRepository.findPublicConfigurations(options);
    } else {
      configurations = await configurationRepository.findAll({
        include: {
          user: { select: { id: true, name: true } },
          components: {
            include: { product: true }
          },
        },
        ...options,
      });
    }

    const whereClause = search ? {
      AND: [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        },
        { isPublic: true },
      ],
    } : userId ? { userId } : isPublic === 'true' ? { isPublic: true } : {};

    const total = await configurationRepository.count(whereClause);
    
    res.json({
      success: true,
      data: {
        configurations,
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

// POST /api/configurations - Create new configuration
router.post('/',
  // TODO: Add authentication middleware
  validate(schemas.createConfiguration, 'body'),
  asyncHandler(async (req, res) => {
    const { name, description, components, isPublic, tags, userId } = req.body;
    
    logger.info('Creating configuration', { name, userId });
    
    // Calculate total price
    const totalPrice = components.reduce((sum, comp) => {
      return sum + (comp.price * comp.quantity);
    }, 0);
    
    const configData = {
      name,
      description,
      totalPrice,
      isPublic: isPublic || false,
      tags,
      userId,
    };
    
    const configuration = await configurationRepository.createConfiguration(
      configData, 
      components
    );
    
    res.status(201).json({
      success: true,
      data: { configuration },
    });
  })
);

// GET /api/configurations/popular - Get popular configurations
router.get('/popular', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const configurations = await configurationRepository.getPopularConfigurations(limit);
  
  res.json({
    success: true,
    data: { configurations },
  });
}));

// GET /api/configurations/:id - Get single configuration
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const configuration = await configurationRepository.findById(id, {
    user: { select: { id: true, name: true } },
    components: {
      include: { product: true }
    },
  });
  
  if (!configuration) {
    return res.status(404).json({
      success: false,
      error: { message: 'Configuration not found' },
    });
  }
  
  logger.info('Fetched configuration', { configurationId: id });
  
  res.json({
    success: true,
    data: { configuration },
  });
}));

// PUT /api/configurations/:id - Update configuration
router.put('/:id',
  // TODO: Add authentication middleware and ownership check
  validate(schemas.updateConfiguration, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, components, isPublic, tags } = req.body;
    
    logger.info('Updating configuration', { configurationId: id });
    
    // Calculate new total price if components provided
    let totalPrice;
    if (components) {
      totalPrice = components.reduce((sum, comp) => {
        return sum + (comp.price * comp.quantity);
      }, 0);
    }
    
    const configData = {
      name,
      description,
      totalPrice,
      isPublic,
      tags,
    };
    
    const configuration = await configurationRepository.updateConfiguration(
      id, 
      configData, 
      components
    );
    
    res.json({
      success: true,
      data: { configuration },
    });
  })
);

// DELETE /api/configurations/:id - Delete configuration
router.delete('/:id',
  // TODO: Add authentication middleware and ownership check
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    logger.info('Deleting configuration', { configurationId: id });
    
    await configurationRepository.delete(id);
    
    res.json({
      success: true,
      message: 'Configuration deleted successfully',
    });
  })
);

// POST /api/configurations/:id/clone - Clone configuration
router.post('/:id/clone',
  // TODO: Add authentication middleware
  validate(schemas.cloneConfiguration, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, userId } = req.body;
    
    logger.info('Cloning configuration', { originalId: id, userId });
    
    const configuration = await configurationRepository.cloneConfiguration(
      id, 
      userId, 
      name
    );
    
    res.status(201).json({
      success: true,
      data: { configuration },
    });
  })
);

// POST /api/configurations/:id/validate - Validate configuration
router.post('/:id/validate', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const validation = await configurationRepository.validateConfiguration(id);
  
  res.json({
    success: true,
    data: { validation },
  });
}));

// PATCH /api/configurations/:id/visibility - Update configuration visibility
router.patch('/:id/visibility',
  // TODO: Add authentication middleware and ownership check
  validate(schemas.updateVisibility, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isPublic } = req.body;
    
    logger.info('Updating configuration visibility', { 
      configurationId: id, 
      isPublic 
    });
    
    const configuration = isPublic 
      ? await configurationRepository.makePublic(id)
      : await configurationRepository.makePrivate(id);
    
    res.json({
      success: true,
      data: { configuration },
    });
  })
);

// GET /api/configurations/user/:userId - Get user's configurations
router.get('/user/:userId',
  validate(schemas.pagination, 'query'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const options = {
      skip: (page - 1) * limit,
      take: parseInt(limit),
    };
    
    const configurations = await configurationRepository.findByUser(userId, options);
    const total = await configurationRepository.count({ userId });
    
    res.json({
      success: true,
      data: {
        configurations,
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

// GET /api/configurations/tags/:tag - Get configurations by tag
router.get('/tags/:tag',
  validate(schemas.pagination, 'query'),
  asyncHandler(async (req, res) => {
    const { tag } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const options = {
      skip: (page - 1) * limit,
      take: parseInt(limit),
    };
    
    const configurations = await configurationRepository.findByTags([tag], options);
    
    res.json({
      success: true,
      data: {
        configurations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: configurations.length,
          pages: Math.ceil(configurations.length / limit),
        },
      },
    });
  })
);

// PUT /api/configurations/:id/price - Update configuration total price
router.put('/:id/price',
  // TODO: Add admin authentication middleware
  validate(schemas.updatePrice, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { totalPrice } = req.body;
    
    logger.info('Updating configuration price', { configurationId: id, totalPrice });
    
    const configuration = await configurationRepository.updateTotalPrice(id, totalPrice);
    
    res.json({
      success: true,
      data: { configuration },
    });
  })
);

export default router;