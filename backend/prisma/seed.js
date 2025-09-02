import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Clean existing data
    await cleanDatabase();

    // Seed data in order of dependencies
    const users = await seedUsers();
    const components = await seedComponents();
    const configurations = await seedConfigurations(users, components);
    const orders = await seedOrders(users, configurations, components);
    await seedSystemConfig();

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

async function cleanDatabase() {
  console.log('🧹 Cleaning existing data...');
  
  // Delete in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.manual.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.configComponent.deleteMany();
  await prisma.configuration.deleteMany();
  await prisma.component.deleteMany();
  await prisma.product.deleteMany(); // Legacy
  await prisma.user.deleteMany();
  await prisma.systemConfig.deleteMany();
}

async function seedUsers() {
  console.log('👥 Seeding users...');

  const users = [
    {
      email: 'admin@diyhumanoid.com',
      name: 'System Administrator',
      role: 'ADMIN',
      isActive: true,
    },
    {
      email: 'support@diyhumanoid.com',
      name: 'Support Team',
      role: 'SUPPORT',
      isActive: true,
    },
    {
      email: 'john.doe@example.com',
      name: 'John Doe',
      role: 'CUSTOMER',
      isActive: true,
      profile: {
        experienceLevel: 'beginner',
        interests: ['robotics', 'AI'],
      },
    },
    {
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      role: 'CUSTOMER',
      isActive: true,
      profile: {
        experienceLevel: 'intermediate',
        interests: ['engineering', 'automation'],
      },
    },
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.create({
      data: userData,
    });
    createdUsers.push(user);
  }

  console.log(`✅ Created ${createdUsers.length} users`);
  return createdUsers;
}

async function seedComponents() {
  console.log('🔧 Seeding components...');

  const components = [
    // HEAD Components
    {
      name: 'Basic Vision Head',
      description: 'Entry-level humanoid head with basic camera and LCD display',
      category: 'HEAD',
      price: 299.99,
      availability: 'in-stock',
      imageUrl: '/images/components/head-basic.jpg',
      specifications: {
        camera: '720p HD Camera',
        display: '5-inch LCD',
        weight: '1.2kg',
        materials: ['ABS Plastic', 'Aluminum'],
      },
      instructions: 'Mount the head assembly to the neck joint. Connect power and data cables carefully.',
      toolsRequired: ['Phillips screwdriver', 'Wire strippers', 'Multimeter'],
      timeEstimate: 45,
      difficultyLevel: 'BEGINNER',
    },
    {
      name: 'Advanced AI Head',
      description: 'Professional-grade head with AI processing and advanced sensors',
      category: 'HEAD',
      price: 899.99,
      availability: 'in-stock',
      imageUrl: '/images/components/head-advanced.jpg',
      specifications: {
        camera: '4K Ultra HD Camera',
        display: '7-inch OLED Touch',
        processor: 'Jetson Nano',
        sensors: ['Microphone Array', 'IMU', 'Temperature'],
        weight: '2.1kg',
        materials: ['Carbon Fiber', 'Titanium'],
      },
      instructions: 'Complex assembly requiring careful sensor calibration and software setup.',
      toolsRequired: ['Torx screwdrivers', 'ESD mat', 'Calibration tools'],
      timeEstimate: 120,
      difficultyLevel: 'EXPERT',
    },

    // TORSO Components
    {
      name: 'Standard Torso Frame',
      description: 'Durable aluminum torso frame with servo mounting points',
      category: 'TORSO',
      price: 599.99,
      availability: 'in-stock',
      imageUrl: '/images/components/torso-standard.jpg',
      specifications: {
        material: 'Aluminum 6061',
        weight: '3.5kg',
        servos: '6x mounting points',
        power: '12V/24V compatible',
      },
      instructions: 'Assemble the main torso frame and install servo motors at designated mounting points.',
      toolsRequired: ['Hex keys', 'Torque wrench', 'Loctite'],
      timeEstimate: 90,
      difficultyLevel: 'INTERMEDIATE',
    },
    {
      name: 'Premium Carbon Torso',
      description: 'Lightweight carbon fiber torso with integrated electronics bay',
      category: 'TORSO',
      price: 1299.99,
      availability: 'low-stock',
      imageUrl: '/images/components/torso-premium.jpg',
      specifications: {
        material: 'Carbon Fiber',
        weight: '2.1kg',
        servos: '8x high-precision mounts',
        electronics: 'Integrated bay with cooling',
        power: '24V/48V compatible',
      },
      instructions: 'Precision assembly required. Handle carbon fiber components with care to avoid damage.',
      toolsRequired: ['Carbon fiber tools', 'Precision hex keys', 'Anti-static equipment'],
      timeEstimate: 150,
      difficultyLevel: 'EXPERT',
    },

    // ARMS Components
    {
      name: 'Basic Arm Set',
      description: 'Simple 3-DOF arms suitable for basic tasks',
      category: 'ARMS',
      price: 349.99,
      availability: 'in-stock',
      imageUrl: '/images/components/arms-basic.jpg',
      specifications: {
        dof: '3 per arm',
        reach: '60cm',
        payload: '1kg per arm',
        weight: '1.8kg per arm',
        servos: 'Standard digital servos',
      },
      instructions: 'Install servos in arm segments and connect control cables through cable management system.',
      toolsRequired: ['Screwdriver set', 'Cable ties', 'Grease'],
      timeEstimate: 75,
      difficultyLevel: 'BEGINNER',
    },
    {
      name: 'Articulated Arm System',
      description: '7-DOF articulated arms with precise control',
      category: 'ARMS',
      price: 799.99,
      availability: 'in-stock',
      imageUrl: '/images/components/arms-articulated.jpg',
      specifications: {
        dof: '7 per arm',
        reach: '80cm',
        payload: '3kg per arm',
        weight: '2.8kg per arm',
        servos: 'High-torque brushless',
        precision: '0.1 degree accuracy',
      },
      instructions: 'Complex multi-segment assembly requiring precise servo alignment and calibration.',
      toolsRequired: ['Precision tools', 'Servo tester', 'Alignment jigs'],
      timeEstimate: 180,
      difficultyLevel: 'ADVANCED',
      prerequisites: ['torso-standard', 'torso-premium'],
    },

    // LEGS Components
    {
      name: 'Walking Legs Basic',
      description: 'Basic bipedal legs for stable walking',
      category: 'LEGS',
      price: 699.99,
      availability: 'in-stock',
      imageUrl: '/images/components/legs-basic.jpg',
      specifications: {
        dof: '6 per leg',
        height: '90cm',
        weight: '4.2kg per leg',
        gait: 'Basic walking patterns',
        stability: 'Gyro stabilization',
      },
      instructions: 'Assemble leg segments and install balance control system. Calibration required.',
      toolsRequired: ['Large hex keys', 'Balance board', 'Calibration software'],
      timeEstimate: 150,
      difficultyLevel: 'INTERMEDIATE',
    },
    {
      name: 'Advanced Bipedal System',
      description: 'High-performance legs with dynamic balancing',
      category: 'LEGS',
      price: 1599.99,
      availability: 'pre-order',
      imageUrl: '/images/components/legs-advanced.jpg',
      specifications: {
        dof: '12 per leg',
        height: '100cm',
        weight: '5.8kg per leg',
        gait: 'Dynamic running capability',
        stability: 'Advanced IMU + AI balance',
        sensors: 'Force feedback in feet',
      },
      instructions: 'Professional assembly required. Complex sensor integration and AI calibration.',
      toolsRequired: ['Professional toolkit', 'Force sensors', 'AI calibration rig'],
      timeEstimate: 300,
      difficultyLevel: 'EXPERT',
      prerequisites: ['torso-premium'],
    },

    // SENSORS
    {
      name: 'Sensor Pack Basic',
      description: 'Essential sensors for humanoid awareness',
      category: 'SENSORS',
      price: 149.99,
      availability: 'in-stock',
      imageUrl: '/images/components/sensors-basic.jpg',
      specifications: {
        sensors: ['Ultrasonic', 'IMU', 'Temperature'],
        range: 'Up to 4m ultrasonic',
        accuracy: 'Standard grade',
      },
      instructions: 'Install sensors according to mounting diagram and connect to main controller.',
      toolsRequired: ['Small screwdrivers', 'Wire connectors'],
      timeEstimate: 30,
      difficultyLevel: 'BEGINNER',
    },

    // ACTUATORS
    {
      name: 'Servo Motor Kit',
      description: 'High-quality servo motors for humanoid joints',
      category: 'ACTUATORS',
      price: 249.99,
      availability: 'in-stock',
      imageUrl: '/images/components/servos-kit.jpg',
      specifications: {
        quantity: '12x servos',
        torque: '20kg-cm each',
        type: 'Digital high-speed',
        voltage: '6-8.4V',
      },
      instructions: 'Install servos in joint locations according to assembly manual.',
      toolsRequired: ['Servo horns', 'Mounting screws'],
      timeEstimate: 60,
      difficultyLevel: 'BEGINNER',
    },

    // ELECTRONICS
    {
      name: 'Main Control Board',
      description: 'Central processing unit for humanoid control',
      category: 'ELECTRONICS',
      price: 399.99,
      availability: 'in-stock',
      imageUrl: '/images/components/controller-main.jpg',
      specifications: {
        processor: 'ARM Cortex-A72',
        ram: '8GB',
        storage: '64GB eMMC',
        gpio: '40-pin header',
        connectivity: ['WiFi', 'Bluetooth', 'Ethernet'],
      },
      instructions: 'Mount controller board in electronics bay and connect all system cables.',
      toolsRequired: ['Anti-static wrist strap', 'Small screwdrivers'],
      timeEstimate: 45,
      difficultyLevel: 'INTERMEDIATE',
    },

    // ACCESSORIES
    {
      name: 'Tool Kit Professional',
      description: 'Complete tool set for humanoid assembly',
      category: 'ACCESSORIES',
      price: 89.99,
      availability: 'in-stock',
      imageUrl: '/images/components/toolkit.jpg',
      specifications: {
        tools: ['Hex keys', 'Screwdrivers', 'Pliers', 'Wire strippers'],
        case: 'Organized carrying case',
        quality: 'Professional grade',
      },
      instructions: 'No assembly required. Use appropriate tools for each component.',
      toolsRequired: [],
      timeEstimate: 0,
      difficultyLevel: 'BEGINNER',
    },
  ];

  const createdComponents = [];
  for (const componentData of components) {
    const component = await prisma.component.create({
      data: componentData,
    });
    createdComponents.push(component);
  }

  console.log(`✅ Created ${createdComponents.length} components`);
  return createdComponents;
}

async function seedConfigurations(users, components) {
  console.log('⚙️ Seeding configurations...');

  const customer1 = users.find(u => u.email === 'john.doe@example.com');
  const customer2 = users.find(u => u.email === 'jane.smith@example.com');

  const configurations = [
    {
      name: 'Beginner Humanoid',
      description: 'Perfect starter configuration for robotics beginners',
      totalPrice: 1399.96,
      isPublic: true,
      tags: ['beginner', 'starter', 'educational'],
      userId: customer1.id,
      components: [
        { componentType: 'head', productId: components.find(c => c.name === 'Basic Vision Head').id, quantity: 1, options: {} },
        { componentType: 'torso', productId: components.find(c => c.name === 'Standard Torso Frame').id, quantity: 1, options: {} },
        { componentType: 'arms', productId: components.find(c => c.name === 'Basic Arm Set').id, quantity: 1, options: {} },
        { componentType: 'legs', productId: components.find(c => c.name === 'Walking Legs Basic').id, quantity: 1, options: {} },
        { componentType: 'sensors', productId: components.find(c => c.name === 'Sensor Pack Basic').id, quantity: 1, options: {} },
      ],
    },
    {
      name: 'Advanced Research Platform',
      description: 'High-end configuration for research and development',
      totalPrice: 4549.95,
      isPublic: true,
      tags: ['advanced', 'research', 'professional', 'ai'],
      userId: customer2.id,
      components: [
        { componentType: 'head', productId: components.find(c => c.name === 'Advanced AI Head').id, quantity: 1, options: {} },
        { componentType: 'torso', productId: components.find(c => c.name === 'Premium Carbon Torso').id, quantity: 1, options: {} },
        { componentType: 'arms', productId: components.find(c => c.name === 'Articulated Arm System').id, quantity: 1, options: {} },
        { componentType: 'legs', productId: components.find(c => c.name === 'Advanced Bipedal System').id, quantity: 1, options: {} },
        { componentType: 'electronics', productId: components.find(c => c.name === 'Main Control Board').id, quantity: 1, options: {} },
      ],
    },
    {
      name: 'Custom Build V1',
      description: 'Personal custom configuration',
      totalPrice: 1899.96,
      isPublic: false,
      tags: ['custom', 'personal'],
      userId: customer1.id,
      components: [
        { componentType: 'head', productId: components.find(c => c.name === 'Basic Vision Head').id, quantity: 1, options: {} },
        { componentType: 'torso', productId: components.find(c => c.name === 'Premium Carbon Torso').id, quantity: 1, options: {} },
        { componentType: 'arms', productId: components.find(c => c.name === 'Basic Arm Set').id, quantity: 1, options: {} },
        { componentType: 'actuators', productId: components.find(c => c.name === 'Servo Motor Kit').id, quantity: 1, options: {} },
      ],
    },
  ];

  const createdConfigurations = [];
  for (const configData of configurations) {
    const { components: configComponents, ...configInfo } = configData;
    
    const configuration = await prisma.configuration.create({
      data: configInfo,
    });

    // Add components to configuration
    for (const component of configComponents) {
      await prisma.configComponent.create({
        data: {
          ...component,
          configurationId: configuration.id,
        },
      });
    }

    createdConfigurations.push(configuration);
  }

  console.log(`✅ Created ${createdConfigurations.length} configurations`);
  return createdConfigurations;
}

async function seedOrders(users, configurations, components) {
  console.log('📦 Seeding orders...');

  const customer1 = users.find(u => u.email === 'john.doe@example.com');
  const customer2 = users.find(u => u.email === 'jane.smith@example.com');
  const beginnerConfig = configurations.find(c => c.name === 'Beginner Humanoid');

  const orders = [
    {
      orderNumber: 'ORD-2024-001',
      status: 'DELIVERED',
      paymentStatus: 'COMPLETED',
      total: 1399.96,
      paymentMethod: 'stripe',
      paymentId: 'pi_test_123456',
      trackingNumber: 'TRK001234567',
      shippingMethod: 'standard',
      customerInfo: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        address: {
          street: '123 Tech Street',
          city: 'Innovation City',
          state: 'CA',
          zipCode: '90210',
          country: 'USA',
        },
      },
      userId: customer1.id,
      configurationId: beginnerConfig.id,
      items: [
        { name: 'Basic Vision Head', price: 299.99, quantity: 1, productId: components.find(c => c.name === 'Basic Vision Head').id },
        { name: 'Standard Torso Frame', price: 599.99, quantity: 1, productId: components.find(c => c.name === 'Standard Torso Frame').id },
        { name: 'Basic Arm Set', price: 349.99, quantity: 1, productId: components.find(c => c.name === 'Basic Arm Set').id },
        { name: 'Sensor Pack Basic', price: 149.99, quantity: 1, productId: components.find(c => c.name === 'Sensor Pack Basic').id },
      ],
    },
    {
      orderNumber: 'ORD-2024-002',
      status: 'PROCESSING',
      paymentStatus: 'COMPLETED',
      total: 899.99,
      paymentMethod: 'paypal',
      paymentId: 'PAYID-TEST-789',
      customerInfo: {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        address: {
          street: '456 Innovation Ave',
          city: 'Tech Valley',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
        },
      },
      userId: customer2.id,
      items: [
        { name: 'Advanced AI Head', price: 899.99, quantity: 1, productId: components.find(c => c.name === 'Advanced AI Head').id },
      ],
    },
    {
      orderNumber: 'ORD-2024-003',
      status: 'PENDING',
      paymentStatus: 'PENDING',
      total: 249.99,
      paymentMethod: 'stripe',
      customerInfo: {
        name: 'Test User',
        email: 'test@example.com',
        address: {
          street: '789 Test St',
          city: 'Test City',
          state: 'TX',
          zipCode: '12345',
          country: 'USA',
        },
      },
      items: [
        { name: 'Servo Motor Kit', price: 249.99, quantity: 1, productId: components.find(c => c.name === 'Servo Motor Kit').id },
      ],
    },
  ];

  const createdOrders = [];
  for (const orderData of orders) {
    const { items, ...orderInfo } = orderData;
    
    const order = await prisma.order.create({
      data: orderInfo,
    });

    // Add items to order
    for (const item of items) {
      await prisma.orderItem.create({
        data: {
          ...item,
          orderId: order.id,
        },
      });
    }

    // Add sample payment for completed orders
    if (orderData.paymentStatus === 'COMPLETED') {
      await prisma.payment.create({
        data: {
          paymentId: orderData.paymentId,
          provider: orderData.paymentMethod,
          amount: orderData.total,
          currency: 'USD',
          status: 'COMPLETED',
          paymentData: { test: true },
          orderId: order.id,
        },
      });
    }

    createdOrders.push(order);
  }

  console.log(`✅ Created ${createdOrders.length} orders`);
  return createdOrders;
}

async function seedSystemConfig() {
  console.log('⚙️ Seeding system configuration...');

  const configs = [
    {
      key: 'site_name',
      value: { name: 'DIY Humanoid Configurator' },
    },
    {
      key: 'maintenance_mode',
      value: { enabled: false, message: 'System maintenance in progress' },
    },
    {
      key: 'payment_settings',
      value: {
        stripe_enabled: true,
        paypal_enabled: true,
        currency: 'USD',
        tax_rate: 0.08,
      },
    },
    {
      key: 'shipping_settings',
      value: {
        free_shipping_threshold: 1000,
        standard_rate: 25.00,
        express_rate: 50.00,
        overnight_rate: 100.00,
      },
    },
    {
      key: 'notification_settings',
      value: {
        email_enabled: true,
        webhook_enabled: false,
        admin_alerts: true,
      },
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.create({
      data: config,
    });
  }

  console.log(`✅ Created ${configs.length} system configurations`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });