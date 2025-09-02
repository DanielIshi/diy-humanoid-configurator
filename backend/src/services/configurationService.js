import { ConfigurationRepository, ComponentRepository } from '../repositories/index.js';
import { logger } from '../lib/logger.js';

class ConfigurationService {
  constructor() {
    this.configurationRepository = new ConfigurationRepository();
    this.componentRepository = new ComponentRepository();
  }

  async createConfiguration(configurationData, userId) {
    try {
      const { name, description, components, isPublic = false, tags } = configurationData;
      
      logger.info('Creating configuration', { name, userId, componentCount: components.length });

      // Validate all components exist and are available
      await this.validateComponents(components);

      // Calculate total price and time estimate
      const { totalPrice, totalTime } = await this.calculateConfigurationMetrics(components);

      // Validate configuration completeness
      const validation = this.validateConfigurationStructure(components);
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
      }

      const configData = {
        name,
        description,
        totalPrice,
        isPublic,
        tags,
        userId,
        metadata: {
          totalAssemblyTime: totalTime,
          componentCount: components.length,
          difficultyLevel: this.calculateOverallDifficulty(components),
          validationStatus: validation,
        },
      };

      const configuration = await this.configurationRepository.createConfiguration(
        configData,
        components
      );

      logger.info('Configuration created successfully', { 
        configurationId: configuration.id 
      });

      return configuration;
    } catch (error) {
      logger.error('Failed to create configuration', { error: error.message });
      throw error;
    }
  }

  async validateComponents(components) {
    const componentIds = components.map(c => c.componentId);
    const existingComponents = await this.componentRepository.getComponentsByIds(componentIds);
    
    if (existingComponents.length !== componentIds.length) {
      const foundIds = existingComponents.map(c => c.id);
      const missingIds = componentIds.filter(id => !foundIds.includes(id));
      throw new Error(`Components not found: ${missingIds.join(', ')}`);
    }

    // Check availability
    const unavailableComponents = existingComponents.filter(c => c.availability !== 'in-stock');
    if (unavailableComponents.length > 0) {
      const names = unavailableComponents.map(c => c.name).join(', ');
      throw new Error(`Unavailable components: ${names}`);
    }

    return existingComponents;
  }

  async calculateConfigurationMetrics(components) {
    const componentIds = components.map(c => c.componentId);
    const componentDetails = await this.componentRepository.getComponentsByIds(componentIds);
    
    let totalPrice = 0;
    let totalTime = 0;

    for (const configComponent of components) {
      const componentDetail = componentDetails.find(c => c.id === configComponent.componentId);
      if (componentDetail) {
        totalPrice += componentDetail.price * configComponent.quantity;
        if (componentDetail.timeEstimate) {
          totalTime += componentDetail.timeEstimate * configComponent.quantity;
        }
      }
    }

    return { totalPrice, totalTime };
  }

  validateConfigurationStructure(components) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Check for required component categories
    const requiredCategories = ['HEAD', 'TORSO', 'ARMS', 'LEGS'];
    const presentCategories = [];

    // Map component types to categories
    for (const component of components) {
      const categoryMap = {
        head: 'HEAD',
        torso: 'TORSO',
        arms: 'ARMS',
        legs: 'LEGS',
      };
      
      const category = categoryMap[component.componentType];
      if (category && !presentCategories.includes(category)) {
        presentCategories.push(category);
      }
    }

    // Check for missing required categories
    for (const required of requiredCategories) {
      if (!presentCategories.includes(required)) {
        validation.errors.push(`Missing required component category: ${required}`);
        validation.isValid = false;
      }
    }

    // Check for component compatibility (basic validation)
    const armComponents = components.filter(c => c.componentType === 'arms');
    if (armComponents.length > 1) {
      validation.warnings.push('Multiple arm components detected - ensure compatibility');
    }

    const legComponents = components.filter(c => c.componentType === 'legs');
    if (legComponents.length > 1) {
      validation.warnings.push('Multiple leg components detected - ensure compatibility');
    }

    return validation;
  }

  calculateOverallDifficulty(components) {
    // Map difficulty levels to numeric values
    const difficultyLevels = {
      BEGINNER: 1,
      INTERMEDIATE: 2,
      ADVANCED: 3,
      EXPERT: 4,
    };

    // For now, return highest difficulty (would need component details in real implementation)
    // This is a simplified version
    return 'INTERMEDIATE'; // Default assumption
  }

  async updateConfiguration(configurationId, updateData, userId) {
    try {
      logger.info('Updating configuration', { configurationId, userId });

      // Check ownership or admin rights
      const existingConfig = await this.configurationRepository.findById(configurationId);
      if (!existingConfig) {
        throw new Error('Configuration not found');
      }

      if (existingConfig.userId !== userId) {
        // TODO: Check if user is admin
        throw new Error('Unauthorized to update this configuration');
      }

      const { name, description, components, isPublic, tags } = updateData;
      
      let totalPrice = existingConfig.totalPrice;
      let metadata = existingConfig.metadata;

      // If components are being updated, recalculate metrics
      if (components) {
        await this.validateComponents(components);
        const metrics = await this.calculateConfigurationMetrics(components);
        totalPrice = metrics.totalPrice;
        
        const validation = this.validateConfigurationStructure(components);
        metadata = {
          ...metadata,
          totalAssemblyTime: metrics.totalTime,
          componentCount: components.length,
          difficultyLevel: this.calculateOverallDifficulty(components),
          validationStatus: validation,
          lastUpdated: new Date(),
        };
      }

      const configData = {
        name,
        description,
        totalPrice,
        isPublic,
        tags,
        metadata,
      };

      const configuration = await this.configurationRepository.updateConfiguration(
        configurationId,
        configData,
        components
      );

      logger.info('Configuration updated successfully', { configurationId });

      return configuration;
    } catch (error) {
      logger.error('Failed to update configuration', { 
        configurationId, 
        error: error.message 
      });
      throw error;
    }
  }

  async cloneConfiguration(configurationId, userId, newName) {
    try {
      logger.info('Cloning configuration', { configurationId, userId, newName });

      const originalConfig = await this.configurationRepository.findById(configurationId, {
        components: true,
      });

      if (!originalConfig) {
        throw new Error('Original configuration not found');
      }

      if (!originalConfig.isPublic && originalConfig.userId !== userId) {
        throw new Error('Cannot clone private configuration');
      }

      const cloneName = newName || `${originalConfig.name} (Copy)`;
      
      const clonedConfig = await this.configurationRepository.cloneConfiguration(
        configurationId,
        userId,
        cloneName
      );

      logger.info('Configuration cloned successfully', { 
        originalId: configurationId,
        cloneId: clonedConfig.id 
      });

      return clonedConfig;
    } catch (error) {
      logger.error('Failed to clone configuration', { 
        configurationId, 
        error: error.message 
      });
      throw error;
    }
  }

  async validateConfigurationForOrder(configurationId) {
    try {
      const validation = await this.configurationRepository.validateConfiguration(configurationId);
      
      // Additional order-specific validations
      const config = await this.configurationRepository.findById(configurationId, {
        components: {
          include: { product: true }
        },
      });

      if (!config) {
        throw new Error('Configuration not found');
      }

      // Check component availability for ordering
      const unavailableComponents = [];
      for (const component of config.components) {
        if (component.product && component.product.availability !== 'in-stock') {
          unavailableComponents.push(component.product.name);
        }
      }

      if (unavailableComponents.length > 0) {
        validation.errors.push(`Components unavailable for ordering: ${unavailableComponents.join(', ')}`);
        validation.isValid = false;
      }

      return validation;
    } catch (error) {
      logger.error('Failed to validate configuration for order', { 
        configurationId, 
        error: error.message 
      });
      throw error;
    }
  }

  async getConfigurationRecommendations(configurationId, userId) {
    try {
      logger.info('Getting configuration recommendations', { configurationId });

      const config = await this.configurationRepository.findById(configurationId, {
        components: true,
      });

      if (!config) {
        throw new Error('Configuration not found');
      }

      const recommendations = {
        upgrades: [],
        alternatives: [],
        accessories: [],
        estimatedImprovements: {},
      };

      // TODO: Implement AI-based recommendation logic
      // For now, return placeholder recommendations

      // Find potential upgrades
      const componentCategories = config.components.map(c => c.componentType);
      const accessories = await this.componentRepository.findByCategory('ACCESSORIES', {
        take: 5,
      });

      recommendations.accessories = accessories.map(accessory => ({
        component: accessory,
        reason: 'Enhance functionality',
        priceIncrease: accessory.price,
      }));

      return recommendations;
    } catch (error) {
      logger.error('Failed to get configuration recommendations', { 
        configurationId, 
        error: error.message 
      });
      throw error;
    }
  }

  async getPopularConfigurations(limit = 10, category = null) {
    try {
      const configurations = await this.configurationRepository.findPublicConfigurations({
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      // TODO: Implement actual popularity metrics (views, orders, likes)
      // For now, return recent public configurations

      return configurations;
    } catch (error) {
      logger.error('Failed to get popular configurations', { error: error.message });
      throw error;
    }
  }

  async optimizeConfiguration(configurationId, optimizationGoals = {}) {
    try {
      const { budget, timeLimit, difficultyLevel } = optimizationGoals;
      
      logger.info('Optimizing configuration', { 
        configurationId, 
        optimizationGoals 
      });

      const config = await this.configurationRepository.findById(configurationId, {
        components: {
          include: { product: true }
        },
      });

      if (!config) {
        throw new Error('Configuration not found');
      }

      const optimizations = {
        suggestions: [],
        potentialSavings: 0,
        timeReductions: 0,
        difficultyReductions: [],
      };

      // TODO: Implement optimization algorithms
      // - Find alternative components with better price/performance ratio
      // - Suggest component substitutions based on goals
      // - Calculate potential improvements

      return optimizations;
    } catch (error) {
      logger.error('Failed to optimize configuration', { 
        configurationId, 
        error: error.message 
      });
      throw error;
    }
  }
}

export default ConfigurationService;