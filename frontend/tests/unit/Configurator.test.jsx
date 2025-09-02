import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Configurator } from '../../src/components/customer/Configurator.jsx';
import { ConfiguratorContext } from '../../src/contexts/ConfiguratorContext.jsx';

// Mock fetch
global.fetch = vi.fn();

const mockComponents = {
  actuators: [
    {
      id: 'servo-1',
      name: 'Standard Servo Motor',
      price: 25.99,
      specifications: { voltage: '5V', torque: '1.8kg·cm' }
    },
    {
      id: 'servo-2',
      name: 'High Torque Servo',
      price: 45.99,
      specifications: { voltage: '6V', torque: '3.5kg·cm' }
    }
  ],
  controllers: [
    {
      id: 'arduino-1',
      name: 'Arduino Uno',
      price: 23.99,
      specifications: { pins: 14, voltage: '5V' }
    }
  ],
  sensors: [
    {
      id: 'ultrasonic-1',
      name: 'Ultrasonic Sensor',
      price: 8.99,
      specifications: { range: '2-400cm', voltage: '5V' }
    }
  ]
};

const mockContextValue = {
  configuration: {
    name: '',
    components: [],
    totalCost: 0
  },
  updateConfiguration: vi.fn(),
  addComponent: vi.fn(),
  removeComponent: vi.fn(),
  clearConfiguration: vi.fn(),
  saveConfiguration: vi.fn()
};

const ConfiguratorWithContext = ({ contextValue = mockContextValue, ...props }) => (
  <ConfiguratorContext.Provider value={contextValue}>
    <Configurator {...props} />
  </ConfiguratorContext.Provider>
);

describe('Configurator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockClear();
    
    // Mock successful components fetch
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ components: mockComponents })
    });
  });

  it('should render component categories', async () => {
    render(<ConfiguratorWithContext />);
    
    await waitFor(() => {
      expect(screen.getByText('Actuators')).toBeInTheDocument();
      expect(screen.getByText('Controllers')).toBeInTheDocument();
      expect(screen.getByText('Sensors')).toBeInTheDocument();
    });
  });

  it('should load and display components', async () => {
    render(<ConfiguratorWithContext />);
    
    await waitFor(() => {
      expect(screen.getByText('Standard Servo Motor')).toBeInTheDocument();
      expect(screen.getByText('High Torque Servo')).toBeInTheDocument();
      expect(screen.getByText('Arduino Uno')).toBeInTheDocument();
      expect(screen.getByText('Ultrasonic Sensor')).toBeInTheDocument();
    });
  });

  it('should show component prices', async () => {
    render(<ConfiguratorWithContext />);
    
    await waitFor(() => {
      expect(screen.getByText('$25.99')).toBeInTheDocument();
      expect(screen.getByText('$45.99')).toBeInTheDocument();
      expect(screen.getByText('$23.99')).toBeInTheDocument();
    });
  });

  it('should add component to configuration', async () => {
    const user = userEvent.setup();
    const mockAddComponent = vi.fn();
    const contextValue = {
      ...mockContextValue,
      addComponent: mockAddComponent
    };

    render(<ConfiguratorWithContext contextValue={contextValue} />);
    
    await waitFor(() => {
      expect(screen.getByText('Standard Servo Motor')).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add.*standard servo motor/i });
    await user.click(addButton);
    
    expect(mockAddComponent).toHaveBeenCalledWith({
      id: 'servo-1',
      name: 'Standard Servo Motor',
      price: 25.99,
      specifications: { voltage: '5V', torque: '1.8kg·cm' }
    });
  });

  it('should filter components by category', async () => {
    const user = userEvent.setup();
    render(<ConfiguratorWithContext />);
    
    await waitFor(() => {
      expect(screen.getByText('Standard Servo Motor')).toBeInTheDocument();
    });

    // Click on Actuators category filter
    const actuatorsFilter = screen.getByRole('button', { name: /actuators/i });
    await user.click(actuatorsFilter);
    
    expect(screen.getByText('Standard Servo Motor')).toBeInTheDocument();
    expect(screen.getByText('High Torque Servo')).toBeInTheDocument();
    expect(screen.queryByText('Arduino Uno')).not.toBeInTheDocument();
  });

  it('should search components by name', async () => {
    const user = userEvent.setup();
    render(<ConfiguratorWithContext />);
    
    await waitFor(() => {
      expect(screen.getByText('Standard Servo Motor')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search components/i);
    await user.type(searchInput, 'Arduino');
    
    expect(screen.getByText('Arduino Uno')).toBeInTheDocument();
    expect(screen.queryByText('Standard Servo Motor')).not.toBeInTheDocument();
  });

  it('should show component specifications', async () => {
    render(<ConfiguratorWithContext />);
    
    await waitFor(() => {
      expect(screen.getByText('Standard Servo Motor')).toBeInTheDocument();
    });

    // Look for specifications
    expect(screen.getByText(/5V/)).toBeInTheDocument();
    expect(screen.getByText(/1.8kg·cm/)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    // Mock pending fetch
    fetch.mockImplementation(() => new Promise(() => {}));
    
    render(<ConfiguratorWithContext />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should handle fetch error', async () => {
    fetch.mockRejectedValue(new Error('Network error'));
    
    render(<ConfiguratorWithContext />);
    
    await waitFor(() => {
      expect(screen.getByText(/error.*loading.*components/i)).toBeInTheDocument();
    });
  });

  it('should display current configuration', () => {
    const contextValueWithConfig = {
      ...mockContextValue,
      configuration: {
        name: 'My Robot',
        components: [
          { id: 'servo-1', name: 'Standard Servo Motor', quantity: 2, price: 25.99 },
          { id: 'arduino-1', name: 'Arduino Uno', quantity: 1, price: 23.99 }
        ],
        totalCost: 75.97
      }
    };

    render(<ConfiguratorWithContext contextValue={contextValueWithConfig} />);
    
    expect(screen.getByText('My Robot')).toBeInTheDocument();
    expect(screen.getByText('Standard Servo Motor')).toBeInTheDocument();
    expect(screen.getByText('x2')).toBeInTheDocument();
    expect(screen.getByText('$75.97')).toBeInTheDocument();
  });

  it('should remove component from configuration', async () => {
    const user = userEvent.setup();
    const mockRemoveComponent = vi.fn();
    const contextValueWithConfig = {
      ...mockContextValue,
      removeComponent: mockRemoveComponent,
      configuration: {
        name: 'My Robot',
        components: [
          { id: 'servo-1', name: 'Standard Servo Motor', quantity: 1, price: 25.99 }
        ],
        totalCost: 25.99
      }
    };

    render(<ConfiguratorWithContext contextValue={contextValueWithConfig} />);
    
    const removeButton = screen.getByRole('button', { name: /remove.*standard servo motor/i });
    await user.click(removeButton);
    
    expect(mockRemoveComponent).toHaveBeenCalledWith('servo-1');
  });

  it('should save configuration', async () => {
    const user = userEvent.setup();
    const mockSaveConfiguration = vi.fn();
    const contextValueWithConfig = {
      ...mockContextValue,
      saveConfiguration: mockSaveConfiguration,
      configuration: {
        name: 'My Robot',
        components: [
          { id: 'servo-1', name: 'Standard Servo Motor', quantity: 1, price: 25.99 }
        ],
        totalCost: 25.99
      }
    };

    render(<ConfiguratorWithContext contextValue={contextValueWithConfig} />);
    
    const saveButton = screen.getByRole('button', { name: /save configuration/i });
    await user.click(saveButton);
    
    expect(mockSaveConfiguration).toHaveBeenCalled();
  });

  it('should clear configuration', async () => {
    const user = userEvent.setup();
    const mockClearConfiguration = vi.fn();
    const contextValueWithConfig = {
      ...mockContextValue,
      clearConfiguration: mockClearConfiguration,
      configuration: {
        name: 'My Robot',
        components: [
          { id: 'servo-1', name: 'Standard Servo Motor', quantity: 1, price: 25.99 }
        ],
        totalCost: 25.99
      }
    };

    render(<ConfiguratorWithContext contextValue={contextValueWithConfig} />);
    
    const clearButton = screen.getByRole('button', { name: /clear.*configuration/i });
    await user.click(clearButton);
    
    expect(mockClearConfiguration).toHaveBeenCalled();
  });

  it('should be accessible', async () => {
    render(<ConfiguratorWithContext />);
    
    await waitFor(() => {
      expect(screen.getByText('Standard Servo Motor')).toBeInTheDocument();
    });

    // Check for proper ARIA labels
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeInTheDocument();
    
    // Check for proper headings
    const categoryHeadings = screen.getAllByRole('heading', { level: 2 });
    expect(categoryHeadings.length).toBeGreaterThan(0);
  });

  it('should handle component quantity updates', async () => {
    const user = userEvent.setup();
    const mockUpdateConfiguration = vi.fn();
    const contextValueWithConfig = {
      ...mockContextValue,
      updateConfiguration: mockUpdateConfiguration,
      configuration: {
        name: 'My Robot',
        components: [
          { id: 'servo-1', name: 'Standard Servo Motor', quantity: 1, price: 25.99 }
        ],
        totalCost: 25.99
      }
    };

    render(<ConfiguratorWithContext contextValue={contextValueWithConfig} />);
    
    const quantityInput = screen.getByDisplayValue('1');
    await user.clear(quantityInput);
    await user.type(quantityInput, '3');
    
    // Verify quantity change is handled (exact implementation may vary)
    expect(quantityInput).toHaveValue(3);
  });
});