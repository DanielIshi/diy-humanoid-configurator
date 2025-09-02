import { db } from './client.js';
import { logger } from '../lib/logger.js';

const seedData = {
  products: [
    {
      id: 'head-basic',
      name: 'Basic Head Unit',
      description: 'Basic humanoid head with LCD display and basic sensors',
      category: 'head',
      price: 299.99,
      availability: 'in-stock',
      imageUrl: '/images/head-basic.jpg',
      specifications: {
        display: '5-inch LCD',
        weight: '1.2kg',
        materials: ['ABS Plastic', 'Aluminum'],
        sensors: ['Camera', 'Microphone', 'Speakers'],
        powerConsumption: '15W',
      }
    },
    {
      id: 'head-advanced',
      name: 'Advanced Head Unit',
      description: 'Advanced head with AI processing and emotion display',
      category: 'head',
      price: 599.99,
      availability: 'in-stock',
      imageUrl: '/images/head-advanced.jpg',
      specifications: {
        display: '7-inch OLED',
        weight: '1.8kg',
        materials: ['Carbon Fiber', 'Titanium'],
        sensors: ['4K Camera', 'Lidar', 'Microphone Array', 'Speakers'],
        powerConsumption: '35W',
        aiChip: 'Neural Processing Unit',
      }
    },
    {
      id: 'torso-standard',
      name: 'Standard Torso',
      description: 'Standard torso unit with servo motors and basic control systems',
      category: 'torso',
      price: 599.99,
      availability: 'in-stock',
      imageUrl: '/images/torso-standard.jpg',
      specifications: {
        servos: '6x Digital Servos',
        weight: '3.5kg',
        materials: ['Carbon Fiber', 'Aluminum'],
        powerConsumption: '80W',
        battery: '24V 5000mAh',
        connectivity: ['WiFi', 'Bluetooth', 'USB-C'],
      }
    },
    {
      id: 'torso-advanced',
      name: 'Advanced Torso',
      description: 'Advanced torso with enhanced control systems and better actuators',
      category: 'torso',
      price: 999.99,
      availability: 'in-stock',
      imageUrl: '/images/torso-advanced.jpg',
      specifications: {
        servos: '12x High-Torque Digital Servos',
        weight: '4.2kg',
        materials: ['Carbon Fiber', 'Titanium'],
        powerConsumption: '120W',
        battery: '24V 10000mAh',
        connectivity: ['WiFi 6', 'Bluetooth 5.0', 'USB-C', '5G'],
        cooling: 'Active Cooling System',
      }
    },
    {
      id: 'arm-basic',
      name: 'Basic Arms (Pair)',
      description: 'Basic articulated arm pair with 5 DOF each',
      category: 'arms',
      price: 299.99,
      availability: 'in-stock',
      imageUrl: '/images/arm-basic.jpg',
      specifications: {
        dof: '5 per arm',
        weight: '1.5kg per arm',
        materials: ['Aluminum', 'ABS Plastic'],
        payloadCapacity: '2kg',
        reach: '65cm',
      }
    },
    {
      id: 'arm-articulated',
      name: 'Articulated Arms (Pair)',
      description: 'Fully articulated arm pair with 7 DOF each and enhanced grip',
      category: 'arms',
      price: 399.99,
      availability: 'in-stock',
      imageUrl: '/images/arm-articulated.jpg',
      specifications: {
        dof: '7 per arm',
        weight: '2.1kg per arm',
        materials: ['Aluminum', 'Steel'],
        payloadCapacity: '5kg',
        reach: '75cm',
        gripStrength: '50N',
      }
    },
    {
      id: 'leg-basic',
      name: 'Basic Legs (Pair)',
      description: 'Basic bipedal leg system for stationary applications',
      category: 'legs',
      price: 499.99,
      availability: 'in-stock',
      imageUrl: '/images/leg-basic.jpg',
      specifications: {
        dof: '4 per leg',
        weight: '3.0kg per leg',
        materials: ['Aluminum', 'Steel'],
        maxLoad: '80kg',
        height: '90cm',
      }
    },
    {
      id: 'leg-bipedal',
      name: 'Bipedal Legs (Pair)',
      description: 'Advanced bipedal leg system with balance control and walking capability',
      category: 'legs',
      price: 799.99,
      availability: 'low-stock',
      imageUrl: '/images/leg-bipedal.jpg',
      specifications: {
        dof: '6 per leg',
        weight: '4.2kg per leg',
        materials: ['Titanium', 'Carbon Fiber'],
        maxLoad: '120kg',
        height: '95cm',
        walkingSpeed: '3 km/h',
        balanceSystem: 'IMU + Gyroscope',
      }
    }
  ],

  users: [
    {
      id: 'admin-user',
      email: 'admin@example.com',
      name: 'System Administrator',
      role: 'ADMIN',
    },
    {
      id: 'demo-user',
      email: 'demo@example.com',
      name: 'Demo User',
      role: 'USER',
    }
  ],

  configurations: [
    {
      id: 'demo-config-basic',
      name: 'Basic Assistant',
      description: 'A simple humanoid for basic tasks and learning',
      totalPrice: 1199.97,
      userId: 'demo-user',
      metadata: {
        tags: ['beginner', 'basic', 'educational'],
        public: true,
        difficulty: 'beginner'
      }
    },
    {
      id: 'demo-config-advanced',
      name: 'Advanced Worker',
      description: 'Full-featured humanoid for complex tasks',
      totalPrice: 2999.96,
      userId: 'demo-user',
      metadata: {
        tags: ['advanced', 'professional', 'industrial'],
        public: true,
        difficulty: 'advanced'
      }
    }
  ],

  systemConfig: [
    {
      key: 'maintenance_mode',
      value: { enabled: false }
    },
    {
      key: 'payment_providers',
      value: {
        stripe: { enabled: true },
        paypal: { enabled: true }
      }
    },
    {
      key: 'ai_services',
      value: {
        openai: { enabled: true, model: 'gpt-3.5-turbo' },
        openrouter: { enabled: false }
      }
    },
    {
      key: 'features',
      value: {
        configurator: { enabled: true },
        ai_assistant: { enabled: true },
        real_time_preview: { enabled: false }
      }
    }
  ]
};

async function seed() {
  try {
    logger.info('Starting database seed...');

    // Clean existing data (in reverse order of dependencies)
    await db.auditLog.deleteMany({});
    await db.payment.deleteMany({});
    await db.orderItem.deleteMany({});
    await db.order.deleteMany({});
    await db.configComponent.deleteMany({});
    await db.configuration.deleteMany({});
    await db.product.deleteMany({});
    await db.user.deleteMany({});
    await db.systemConfig.deleteMany({});

    logger.info('Cleared existing data');

    // Seed users
    await db.user.createMany({
      data: seedData.users,
    });
    logger.info(`Seeded ${seedData.users.length} users`);

    // Seed products
    await db.product.createMany({
      data: seedData.products,
    });
    logger.info(`Seeded ${seedData.products.length} products`);

    // Seed configurations
    await db.configuration.createMany({
      data: seedData.configurations,
    });
    logger.info(`Seeded ${seedData.configurations.length} configurations`);

    // Seed configuration components for basic config
    await db.configComponent.createMany({
      data: [
        {
          configurationId: 'demo-config-basic',
          productId: 'head-basic',
          componentType: 'head',
          quantity: 1
        },
        {
          configurationId: 'demo-config-basic',
          productId: 'torso-standard',
          componentType: 'torso',
          quantity: 1
        },
        {
          configurationId: 'demo-config-basic',
          productId: 'arm-basic',
          componentType: 'arms',
          quantity: 1
        }
      ]
    });

    // Seed configuration components for advanced config
    await db.configComponent.createMany({
      data: [
        {
          configurationId: 'demo-config-advanced',
          productId: 'head-advanced',
          componentType: 'head',
          quantity: 1
        },
        {
          configurationId: 'demo-config-advanced',
          productId: 'torso-advanced',
          componentType: 'torso',
          quantity: 1
        },
        {
          configurationId: 'demo-config-advanced',
          productId: 'arm-articulated',
          componentType: 'arms',
          quantity: 1
        },
        {
          configurationId: 'demo-config-advanced',
          productId: 'leg-bipedal',
          componentType: 'legs',
          quantity: 1
        }
      ]
    });

    logger.info('Seeded configuration components');

    // Seed system configuration
    await db.systemConfig.createMany({
      data: seedData.systemConfig,
    });
    logger.info(`Seeded ${seedData.systemConfig.length} system config entries`);

    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
}

export default seed;