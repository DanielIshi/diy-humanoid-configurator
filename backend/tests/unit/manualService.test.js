import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { ManualService } from '../../src/services/manualService.js';

// Mock dependencies
const mockManualRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByConfigurationId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
};

const mockOpenAI = {
  chat: {
    completions: {
      create: vi.fn()
    }
  }
};

describe('ManualService', () => {
  let manualService;

  beforeEach(() => {
    vi.clearAllMocks();
    manualService = new ManualService(mockManualRepository, mockOpenAI);
  });

  describe('generateManual', () => {
    it('should generate manual for valid configuration', async () => {
      // Arrange
      const mockConfiguration = {
        id: '123',
        name: 'Test Robot',
        components: [
          { name: 'Servo Motor', type: 'actuator', specifications: { voltage: '5V' } },
          { name: 'Arduino Uno', type: 'controller', specifications: { pins: 14 } }
        ]
      };

      const mockOpenAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              title: 'DIY Humanoid Assembly Manual',
              sections: [
                {
                  title: 'Introduction',
                  content: 'Welcome to your DIY humanoid project...',
                  steps: []
                },
                {
                  title: 'Assembly Instructions',
                  content: 'Follow these steps carefully...',
                  steps: [
                    { number: 1, instruction: 'Connect servo motor to Arduino', image: null },
                    { number: 2, instruction: 'Upload control software', image: null }
                  ]
                }
              ],
              safetyNotes: ['Always disconnect power when wiring', 'Use proper ESD protection'],
              estimatedTime: '4-6 hours',
              difficultyLevel: 'Intermediate'
            })
          }
        }]
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);
      mockManualRepository.create.mockResolvedValue({
        id: 'manual-456',
        configurationId: '123',
        content: mockOpenAIResponse.choices[0].message.content
      });

      // Act
      const result = await manualService.generateManual(mockConfiguration);

      // Assert
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('assembly manual')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Test Robot')
          })
        ]),
        temperature: 0.7,
        max_tokens: 4000
      });

      expect(mockManualRepository.create).toHaveBeenCalledWith({
        configurationId: '123',
        title: 'DIY Humanoid Assembly Manual',
        content: expect.any(String),
        sections: expect.any(Array),
        metadata: expect.objectContaining({
          estimatedTime: '4-6 hours',
          difficultyLevel: 'Intermediate'
        })
      });

      expect(result).toEqual({
        id: 'manual-456',
        configurationId: '123',
        content: expect.any(String)
      });
    });

    it('should throw error for invalid configuration', async () => {
      // Arrange
      const invalidConfiguration = null;

      // Act & Assert
      await expect(manualService.generateManual(invalidConfiguration))
        .rejects
        .toThrow('Invalid configuration provided');
    });

    it('should handle OpenAI API errors gracefully', async () => {
      // Arrange
      const mockConfiguration = {
        id: '123',
        name: 'Test Robot',
        components: []
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      );

      // Act & Assert
      await expect(manualService.generateManual(mockConfiguration))
        .rejects
        .toThrow('Failed to generate manual content');
    });
  });

  describe('getManualById', () => {
    it('should return manual when found', async () => {
      // Arrange
      const mockManual = {
        id: 'manual-123',
        configurationId: '456',
        title: 'Test Manual',
        content: 'Manual content...'
      };

      mockManualRepository.findById.mockResolvedValue(mockManual);

      // Act
      const result = await manualService.getManualById('manual-123');

      // Assert
      expect(mockManualRepository.findById).toHaveBeenCalledWith('manual-123');
      expect(result).toEqual(mockManual);
    });

    it('should return null when manual not found', async () => {
      // Arrange
      mockManualRepository.findById.mockResolvedValue(null);

      // Act
      const result = await manualService.getManualById('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getManualByConfigurationId', () => {
    it('should return manual for valid configuration ID', async () => {
      // Arrange
      const mockManual = {
        id: 'manual-123',
        configurationId: '456',
        title: 'Test Manual'
      };

      mockManualRepository.findByConfigurationId.mockResolvedValue(mockManual);

      // Act
      const result = await manualService.getManualByConfigurationId('456');

      // Assert
      expect(mockManualRepository.findByConfigurationId).toHaveBeenCalledWith('456');
      expect(result).toEqual(mockManual);
    });
  });

  describe('updateManual', () => {
    it('should update existing manual', async () => {
      // Arrange
      const updateData = {
        title: 'Updated Manual',
        content: 'Updated content...'
      };

      const updatedManual = {
        id: 'manual-123',
        ...updateData
      };

      mockManualRepository.update.mockResolvedValue(updatedManual);

      // Act
      const result = await manualService.updateManual('manual-123', updateData);

      // Assert
      expect(mockManualRepository.update).toHaveBeenCalledWith('manual-123', updateData);
      expect(result).toEqual(updatedManual);
    });
  });

  describe('deleteManual', () => {
    it('should delete manual successfully', async () => {
      // Arrange
      mockManualRepository.delete.mockResolvedValue(true);

      // Act
      const result = await manualService.deleteManual('manual-123');

      // Assert
      expect(mockManualRepository.delete).toHaveBeenCalledWith('manual-123');
      expect(result).toBe(true);
    });
  });
});