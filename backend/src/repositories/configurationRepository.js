import BaseRepository from './baseRepository.js';

class ConfigurationRepository extends BaseRepository {
  constructor() {
    super('configuration');
  }

  async findByUser(userId, options = {}) {
    return this.findAll({
      where: { userId },
      include: {
        components: {
          include: { product: true }
        },
      },
      orderBy: { updatedAt: 'desc' },
      ...options,
    });
  }

  async findPublicConfigurations(options = {}) {
    return this.findAll({
      where: { isPublic: true },
      include: {
        user: { select: { id: true, name: true } },
        components: {
          include: { product: true }
        },
      },
      orderBy: { createdAt: 'desc' },
      ...options,
    });
  }

  async findByTags(tags, options = {}) {
    return this.findAll({
      where: {
        tags: {
          array_contains: tags,
        },
        isPublic: true,
      },
      include: {
        user: { select: { id: true, name: true } },
        components: {
          include: { product: true }
        },
      },
      ...options,
    });
  }

  async searchConfigurations(searchTerm, options = {}) {
    return this.findAll({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          { isPublic: true },
        ],
      },
      include: {
        user: { select: { id: true, name: true } },
        components: {
          include: { product: true }
        },
      },
      ...options,
    });
  }

  async createConfiguration(configData, components) {
    return this.transaction(async (prisma) => {
      const configuration = await prisma.configuration.create({
        data: {
          name: configData.name,
          description: configData.description,
          totalPrice: configData.totalPrice,
          metadata: configData.metadata,
          isPublic: configData.isPublic || false,
          tags: configData.tags,
          userId: configData.userId,
        },
      });

      const configComponents = await Promise.all(
        components.map(component =>
          prisma.configComponent.create({
            data: {
              ...component,
              configurationId: configuration.id,
            },
          })
        )
      );

      return {
        ...configuration,
        components: configComponents,
      };
    });
  }

  async updateConfiguration(configId, configData, components = null) {
    return this.transaction(async (prisma) => {
      const configuration = await prisma.configuration.update({
        where: { id: configId },
        data: {
          name: configData.name,
          description: configData.description,
          totalPrice: configData.totalPrice,
          metadata: configData.metadata,
          isPublic: configData.isPublic,
          tags: configData.tags,
        },
      });

      if (components) {
        // Delete existing components
        await prisma.configComponent.deleteMany({
          where: { configurationId: configId },
        });

        // Create new components
        const configComponents = await Promise.all(
          components.map(component =>
            prisma.configComponent.create({
              data: {
                ...component,
                configurationId: configId,
              },
            })
          )
        );

        return {
          ...configuration,
          components: configComponents,
        };
      }

      return configuration;
    });
  }

  async cloneConfiguration(configId, userId, newName) {
    const originalConfig = await this.findById(configId, {
      components: true,
    });

    if (!originalConfig) {
      throw new Error('Configuration not found');
    }

    return this.createConfiguration(
      {
        name: newName || `${originalConfig.name} (Copy)`,
        description: originalConfig.description,
        totalPrice: originalConfig.totalPrice,
        metadata: originalConfig.metadata,
        isPublic: false, // Clones are private by default
        tags: originalConfig.tags,
        userId,
      },
      originalConfig.components.map(component => ({
        componentType: component.componentType,
        options: component.options,
        quantity: component.quantity,
        productId: component.productId,
      }))
    );
  }

  async validateConfiguration(configId) {
    const config = await this.findById(configId, {
      components: {
        include: { product: true }
      },
    });

    if (!config) {
      throw new Error('Configuration not found');
    }

    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      totalPrice: 0,
    };

    // Check if all required component types are present
    const requiredTypes = ['HEAD', 'TORSO', 'ARMS', 'LEGS'];
    const presentTypes = config.components.map(c => c.componentType);
    
    for (const requiredType of requiredTypes) {
      if (!presentTypes.includes(requiredType)) {
        validationResults.errors.push(`Missing required component: ${requiredType}`);
        validationResults.isValid = false;
      }
    }

    // Calculate total price
    for (const component of config.components) {
      if (component.product) {
        validationResults.totalPrice += component.product.price * component.quantity;
      }
    }

    // Check price consistency
    if (Math.abs(config.totalPrice - validationResults.totalPrice) > 0.01) {
      validationResults.warnings.push('Configuration price may be outdated');
    }

    return validationResults;
  }

  async getPopularConfigurations(limit = 10) {
    // In a real implementation, you'd track views or orders
    return this.findPublicConfigurations({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async updateTotalPrice(configId, totalPrice) {
    return this.update(configId, { totalPrice });
  }

  async makePublic(configId) {
    return this.update(configId, { isPublic: true });
  }

  async makePrivate(configId) {
    return this.update(configId, { isPublic: false });
  }
}

export default ConfigurationRepository;