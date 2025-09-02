import BaseRepository from './baseRepository.js';

class ComponentRepository extends BaseRepository {
  constructor() {
    super('component');
  }

  async findByCategory(category, options = {}) {
    return this.findAll({
      where: { category },
      ...options,
    });
  }

  async findAvailable(options = {}) {
    return this.findAll({
      where: { availability: 'in-stock' },
      ...options,
    });
  }

  async findByDifficulty(difficultyLevel, options = {}) {
    return this.findAll({
      where: { difficultyLevel },
      ...options,
    });
  }

  async searchComponents(searchTerm, options = {}) {
    return this.findAll({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      ...options,
    });
  }

  async findWithPrerequisites(componentId) {
    return this.findById(componentId, {
      prerequisites: true,
    });
  }

  async findComponentsWithTimeEstimate(minTime, maxTime) {
    return this.findAll({
      where: {
        timeEstimate: {
          gte: minTime,
          lte: maxTime,
        },
      },
    });
  }

  async updateAvailability(componentId, availability) {
    return this.update(componentId, { availability });
  }

  async getComponentsByIds(componentIds) {
    return this.findAll({
      where: {
        id: { in: componentIds },
      },
    });
  }

  async getPopularComponents(limit = 10) {
    // This would require a view or raw query in real implementation
    // For now, return recent components
    return this.findAll({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async createWithValidation(data) {
    // Validate prerequisites exist
    if (data.prerequisites && data.prerequisites.length > 0) {
      const existingComponents = await this.getComponentsByIds(data.prerequisites);
      if (existingComponents.length !== data.prerequisites.length) {
        throw new Error('Some prerequisite components do not exist');
      }
    }

    return this.create(data);
  }

  async updateInstructions(componentId, instructions, toolsRequired, timeEstimate) {
    return this.update(componentId, {
      instructions,
      toolsRequired,
      timeEstimate,
    });
  }
}

export default ComponentRepository;