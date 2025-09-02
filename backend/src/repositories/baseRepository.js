import { PrismaClient } from '@prisma/client';

class BaseRepository {
  constructor(model) {
    this.prisma = new PrismaClient();
    this.model = model;
  }

  async findAll(options = {}) {
    const { where, include, orderBy, skip, take } = options;
    return this.prisma[this.model].findMany({
      where,
      include,
      orderBy,
      skip,
      take,
    });
  }

  async findById(id, include = null) {
    return this.prisma[this.model].findUnique({
      where: { id },
      include,
    });
  }

  async findOne(where, include = null) {
    return this.prisma[this.model].findFirst({
      where,
      include,
    });
  }

  async create(data) {
    return this.prisma[this.model].create({
      data,
    });
  }

  async update(id, data) {
    return this.prisma[this.model].update({
      where: { id },
      data,
    });
  }

  async delete(id) {
    return this.prisma[this.model].delete({
      where: { id },
    });
  }

  async count(where = {}) {
    return this.prisma[this.model].count({ where });
  }

  async upsert(where, create, update) {
    return this.prisma[this.model].upsert({
      where,
      create,
      update,
    });
  }

  // Transaction wrapper
  async transaction(callback) {
    return this.prisma.$transaction(callback);
  }

  // Cleanup method
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

export default BaseRepository;