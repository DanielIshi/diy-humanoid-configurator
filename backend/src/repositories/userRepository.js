import BaseRepository from './baseRepository.js';
import bcrypt from 'bcrypt';

class UserRepository extends BaseRepository {
  constructor() {
    super('user');
  }

  async findByEmail(email) {
    return this.findOne({ email });
  }

  async findActiveUsers(options = {}) {
    return this.findAll({
      where: { isActive: true },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      ...options,
    });
  }

  async findByRole(role, options = {}) {
    return this.findAll({
      where: { role },
      select: { id: true, email: true, name: true, role: true, isActive: true },
      ...options,
    });
  }

  async createUser(userData) {
    const existingUser = await this.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    return this.create({
      email: userData.email,
      name: userData.name,
      role: userData.role || 'CUSTOMER',
      isActive: userData.isActive !== false,
      profile: userData.profile || {},
    });
  }

  async updateProfile(userId, profileData) {
    const updateData = {};
    
    if (profileData.name) updateData.name = profileData.name;
    if (profileData.profile) updateData.profile = profileData.profile;
    
    return this.update(userId, updateData);
  }

  async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.update(userId, { password: hashedPassword });
  }

  async verifyPassword(userId, password) {
    const user = await this.findById(userId);
    if (!user || !user.password) {
      return false;
    }
    
    return bcrypt.compare(password, user.password);
  }

  async activateUser(userId) {
    return this.update(userId, { 
      isActive: true,
      lastLogin: new Date(),
    });
  }

  async deactivateUser(userId) {
    return this.update(userId, { isActive: false });
  }

  async updateLastLogin(userId) {
    return this.update(userId, { lastLogin: new Date() });
  }

  async getUserWithOrders(userId) {
    return this.findById(userId, {
      orders: {
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10, // Last 10 orders
      },
    });
  }

  async getUserWithConfigurations(userId) {
    return this.findById(userId, {
      configurations: {
        include: {
          components: {
            include: { product: true }
          },
        },
        orderBy: { updatedAt: 'desc' },
      },
    });
  }

  async searchUsers(searchTerm, options = {}) {
    return this.findAll({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, name: true, role: true, isActive: true },
      ...options,
    });
  }

  async getAdminUsers() {
    return this.findByRole('ADMIN');
  }

  async getSupportUsers() {
    return this.findByRole('SUPPORT');
  }

  async getCustomers(options = {}) {
    return this.findByRole('CUSTOMER', options);
  }

  async getUserStatistics(dateFrom, dateTo) {
    const where = {};
    if (dateFrom && dateTo) {
      where.createdAt = {
        gte: dateFrom,
        lte: dateTo,
      };
    }

    const [total, active, customers, admins, support] = await Promise.all([
      this.count(where),
      this.count({ ...where, isActive: true }),
      this.count({ ...where, role: 'CUSTOMER' }),
      this.count({ ...where, role: 'ADMIN' }),
      this.count({ ...where, role: 'SUPPORT' }),
    ]);

    return {
      total,
      active,
      customers,
      admins,
      support,
    };
  }

  async getRecentRegistrations(limit = 10) {
    return this.findAll({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async updateRole(userId, newRole) {
    const validRoles = ['CUSTOMER', 'ADMIN', 'SUPPORT'];
    if (!validRoles.includes(newRole)) {
      throw new Error('Invalid role specified');
    }

    return this.update(userId, { role: newRole });
  }

  async getUserActivity(userId, limit = 20) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async bulkActivateUsers(userIds) {
    return this.prisma[this.model].updateMany({
      where: { id: { in: userIds } },
      data: { isActive: true },
    });
  }

  async bulkDeactivateUsers(userIds) {
    return this.prisma[this.model].updateMany({
      where: { id: { in: userIds } },
      data: { isActive: false },
    });
  }

  async checkEmailExists(email) {
    const user = await this.findByEmail(email);
    return !!user;
  }
}

export default UserRepository;