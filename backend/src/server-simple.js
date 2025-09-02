import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import AI routes
import aiRoutes from './routes/ai.js';

// Simple auth middleware for testing
const simpleAuth = (req, res, next) => {
  // For testing, just add a dummy user
  req.user = {
    id: 'test-user-1',
    email: 'test@example.com',
    role: 'customer'
  };
  next();
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      openai: !!process.env.OPENAI_API_KEY,
      openrouter: !!process.env.OPENROUTER_API_KEY
    }
  });
});

// AI routes with simple auth
app.use('/api/ai', simpleAuth, aiRoutes);

// Test route for components
app.get('/api/components', (req, res) => {
  res.json([
    {
      id: 1,
      name: 'Servo Motor SG90',
      category: 'SERVO',
      price_eur: 4.50,
      description: 'Standard Servo Motor',
      specs: { torque: '1.8kg/cm', voltage: '4.8-6V' }
    },
    {
      id: 2,
      name: 'Arduino Uno',
      category: 'CONTROLLER',
      price_eur: 25.00,
      description: 'Microcontroller Board',
      specs: { pins: 14, memory: '32KB' }
    }
  ]);
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[info] Simple server running on port ${PORT}`);
  console.log(`[info] OpenAI configured: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`[info] OpenRouter configured: ${!!process.env.OPENROUTER_API_KEY}`);
  console.log(`[info] Health check: http://localhost:${PORT}/api/health`);
});