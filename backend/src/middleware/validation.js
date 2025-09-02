import { z } from 'zod';
import { ValidationError, asyncHandler } from './error.js';

// Generic validation middleware
export const validate = (schema, source = 'body') => {
  return asyncHandler(async (req, res, next) => {
    try {
      const data = req[source];
      const validated = await schema.parseAsync(data);
      req[source] = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        throw new ValidationError('Validation failed', details);
      }
      throw error;
    }
  });
};

// Common validation schemas
export const schemas = {
  // Order validation
  createOrder: z.object({
    items: z.array(z.object({
      productId: z.string().min(1, 'Product ID is required'),
      name: z.string().min(1, 'Product name is required'),
      price: z.number().positive('Price must be positive'),
      quantity: z.number().int().positive('Quantity must be a positive integer'),
      options: z.record(z.any()).optional(),
    })).min(1, 'At least one item is required'),
    customerInfo: z.object({
      name: z.string().min(1, 'Customer name is required'),
      email: z.string().email('Valid email is required'),
      phone: z.string().optional(),
      address: z.object({
        street: z.string().min(1, 'Street address is required'),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required'),
        zipCode: z.string().min(1, 'ZIP code is required'),
        country: z.string().min(1, 'Country is required'),
      }),
    }),
    paymentMethod: z.enum(['stripe', 'paypal'], {
      errorMap: () => ({ message: 'Payment method must be stripe or paypal' })
    }),
    notes: z.string().optional(),
  }),

  // Configuration validation
  saveConfiguration: z.object({
    name: z.string().min(1, 'Configuration name is required').max(100),
    description: z.string().optional(),
    components: z.record(z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      price: z.number().positive(),
      options: z.record(z.any()).optional(),
    })),
    totalPrice: z.number().positive('Total price must be positive'),
    metadata: z.record(z.any()).optional(),
  }),

  // AI prompt validation
  aiPrompt: z.object({
    prompt: z.string().min(10, 'Prompt must be at least 10 characters').max(2000, 'Prompt too long'),
    context: z.string().optional(),
    model: z.enum(['gpt-3.5-turbo', 'gpt-4', 'claude-3-haiku']).optional(),
    maxTokens: z.number().int().positive().max(4000).optional(),
  }),

  // Pagination
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),

  // ID parameter validation
  mongoId: z.object({
    id: z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format'),
  }),
};