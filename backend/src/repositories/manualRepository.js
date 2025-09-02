import BaseRepository from './baseRepository.js';

class ManualRepository extends BaseRepository {
  constructor() {
    super('manual');
  }

  async findByOrder(orderId, options = {}) {
    return this.findAll({
      where: { orderId },
      ...options,
    });
  }

  async findByConfiguration(configurationId, options = {}) {
    return this.findAll({
      where: { configurationId },
      ...options,
    });
  }

  async findByComponent(componentId, options = {}) {
    return this.findAll({
      where: { componentId },
      ...options,
    });
  }

  async findPublishedManuals(options = {}) {
    return this.findAll({
      where: { status: 'PUBLISHED' },
      ...options,
    });
  }

  async findByLanguage(language, options = {}) {
    return this.findAll({
      where: { language },
      ...options,
    });
  }

  async createManualForOrder(orderId, manualData) {
    return this.create({
      ...manualData,
      orderId,
      status: 'DRAFT',
    });
  }

  async createManualForConfiguration(configurationId, manualData) {
    return this.create({
      ...manualData,
      configurationId,
      status: 'DRAFT',
    });
  }

  async createComponentManual(componentId, manualData) {
    return this.create({
      ...manualData,
      componentId,
      status: 'DRAFT',
    });
  }

  async generateManualForOrder(orderId, language = 'en') {
    // This would integrate with the manual generation service
    const manualData = {
      title: `Assembly Manual for Order`,
      content: '', // Will be populated by generation service
      format: 'HTML',
      language,
      status: 'DRAFT',
      version: '1.0',
      orderId,
    };

    return this.create(manualData);
  }

  async updateContent(manualId, content, format = null) {
    const updateData = { content };
    if (format) {
      updateData.format = format;
    }
    
    return this.update(manualId, updateData);
  }

  async publishManual(manualId) {
    return this.update(manualId, { 
      status: 'PUBLISHED',
      version: await this.getNextVersion(manualId),
    });
  }

  async archiveManual(manualId) {
    return this.update(manualId, { status: 'ARCHIVED' });
  }

  async getNextVersion(manualId) {
    const manual = await this.findById(manualId);
    if (!manual) {
      throw new Error('Manual not found');
    }

    const currentVersion = manual.version || '1.0';
    const versionParts = currentVersion.split('.');
    const majorVersion = parseInt(versionParts[0]);
    const minorVersion = parseInt(versionParts[1] || 0);

    return `${majorVersion}.${minorVersion + 1}`;
  }

  async findLatestManualForOrder(orderId) {
    return this.findOne(
      { orderId },
      null,
      { createdAt: 'desc' }
    );
  }

  async findLatestManualForConfiguration(configurationId) {
    return this.findOne(
      { configurationId },
      null,
      { createdAt: 'desc' }
    );
  }

  async searchManuals(searchTerm, options = {}) {
    return this.findAll({
      where: {
        AND: [
          {
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { content: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          { status: 'PUBLISHED' },
        ],
      },
      ...options,
    });
  }

  async getManualsRequiringUpdate() {
    // Find manuals that might need updates based on component changes
    // This is a simplified version - in practice you'd track component versions
    return this.findAll({
      where: {
        status: 'PUBLISHED',
        updatedAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        },
      },
    });
  }

  async getManualsByFormat(format, options = {}) {
    return this.findAll({
      where: { format },
      ...options,
    });
  }

  async duplicateManual(manualId, newTitle) {
    const original = await this.findById(manualId);
    if (!original) {
      throw new Error('Manual not found');
    }

    const { id, createdAt, updatedAt, ...manualData } = original;
    
    return this.create({
      ...manualData,
      title: newTitle || `${original.title} (Copy)`,
      status: 'DRAFT',
      version: '1.0',
    });
  }

  async updateMetadata(manualId, metadata) {
    return this.update(manualId, { metadata });
  }

  async getManualStatistics() {
    const [total, draft, published, archived] = await Promise.all([
      this.count(),
      this.count({ status: 'DRAFT' }),
      this.count({ status: 'PUBLISHED' }),
      this.count({ status: 'ARCHIVED' }),
    ]);

    return {
      total,
      draft,
      published,
      archived,
    };
  }
}

export default ManualRepository;