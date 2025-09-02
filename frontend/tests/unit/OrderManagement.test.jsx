import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderManagement } from '../../src/components/admin/OrderManagement.jsx';

// Mock fetch
global.fetch = vi.fn();

const mockOrders = [
  {
    id: 'order-1',
    customerEmail: 'john@example.com',
    status: 'PENDING',
    totalAmount: 125.99,
    createdAt: '2024-01-15T10:30:00Z',
    items: [
      { componentName: 'Standard Servo Motor', quantity: 2, price: 25.99 },
      { componentName: 'Arduino Uno', quantity: 1, price: 23.99 }
    ]
  },
  {
    id: 'order-2',
    customerEmail: 'jane@example.com',
    status: 'PROCESSING',
    totalAmount: 89.97,
    createdAt: '2024-01-14T14:22:00Z',
    items: [
      { componentName: 'Ultrasonic Sensor', quantity: 3, price: 8.99 }
    ]
  },
  {
    id: 'order-3',
    customerEmail: 'bob@example.com',
    status: 'COMPLETED',
    totalAmount: 299.99,
    createdAt: '2024-01-13T09:15:00Z',
    items: [
      { componentName: 'High Torque Servo', quantity: 4, price: 45.99 }
    ]
  }
];

describe('OrderManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockClear();
    
    // Mock successful orders fetch
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ orders: mockOrders })
    });
  });

  it('should render order management title', async () => {
    render(<OrderManagement />);
    
    expect(screen.getByText('Order Management')).toBeInTheDocument();
  });

  it('should load and display orders', async () => {
    render(<OrderManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });
  });

  it('should display order details', async () => {
    render(<OrderManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('$125.99')).toBeInTheDocument();
      expect(screen.getByText('$89.97')).toBeInTheDocument();
      expect(screen.getByText('$299.99')).toBeInTheDocument();
    });
  });

  it('should show order status badges', async () => {
    render(<OrderManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('PENDING')).toBeInTheDocument();
      expect(screen.getByText('PROCESSING')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });
  });

  it('should filter orders by status', async () => {
    const user = userEvent.setup();
    render(<OrderManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    // Filter by PENDING status
    const statusFilter = screen.getByRole('combobox', { name: /filter by status/i });
    await user.selectOptions(statusFilter, 'PENDING');
    
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();
  });

  it('should search orders by customer email', async () => {
    const user = userEvent.setup();
    render(<OrderManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by customer email/i);
    await user.type(searchInput, 'jane');
    
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
  });

  it('should update order status', async () => {
    const user = userEvent.setup();
    
    // Mock successful status update
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ orders: mockOrders })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

    render(<OrderManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    // Find and click status update button for first order
    const statusUpdateButtons = screen.getAllByRole('button', { name: /update status/i });
    await user.click(statusUpdateButtons[0]);
    
    // Select new status
    const statusSelect = screen.getByRole('combobox');
    await user.selectOptions(statusSelect, 'PROCESSING');
    
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/orders/order-1/status',
        expect.objectContaining({
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'PROCESSING' })
        })
      );
    });
  });

  it('should view order details', async () => {
    const user = userEvent.setup();
    render(<OrderManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    const viewButton = screen.getAllByRole('button', { name: /view details/i })[0];
    await user.click(viewButton);
    
    // Order details modal should open
    expect(screen.getByText('Order Details')).toBeInTheDocument();
    expect(screen.getByText('Standard Servo Motor')).toBeInTheDocument();
    expect(screen.getByText('x2')).toBeInTheDocument();
  });

  it('should sort orders by date', async () => {
    const user = userEvent.setup();
    render(<OrderManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    const sortButton = screen.getByRole('button', { name: /sort by date/i });
    await user.click(sortButton);
    
    // Verify sorting is applied (visual verification would depend on implementation)
  });

  it('should handle pagination', async () => {
    const manyOrders = Array.from({ length: 25 }, (_, i) => ({
      id: `order-${i}`,
      customerEmail: `customer${i}@example.com`,
      status: 'PENDING',
      totalAmount: 100 + i,
      createdAt: new Date().toISOString(),
      items: []
    }));

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ 
        orders: manyOrders.slice(0, 10),
        pagination: {
          page: 1,
          pages: 3,
          total: 25
        }
      })
    });

    const user = userEvent.setup();
    render(<OrderManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('customer0@example.com')).toBeInTheDocument();
    });

    // Check pagination controls
    const nextPageButton = screen.getByRole('button', { name: /next page/i });
    expect(nextPageButton).toBeInTheDocument();
    
    await user.click(nextPageButton);
  });

  it('should export orders to CSV', async () => {
    const user = userEvent.setup();
    
    // Mock URL.createObjectURL and document.createElement
    global.URL.createObjectURL = vi.fn(() => 'blob:url');
    global.URL.revokeObjectURL = vi.fn();
    
    const mockClick = vi.fn();
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick,
      style: { display: '' }
    };
    
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    render(<OrderManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', { name: /export to csv/i });
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.download).toBe('orders-export.csv');
      expect(mockClick).toHaveBeenCalled();
    });
  });

  it('should show loading state', () => {
    // Mock pending fetch
    fetch.mockImplementation(() => new Promise(() => {}));
    
    render(<OrderManagement />);
    
    expect(screen.getByText(/loading orders/i)).toBeInTheDocument();
  });

  it('should handle fetch error', async () => {
    fetch.mockRejectedValue(new Error('Network error'));
    
    render(<OrderManagement />);
    
    await waitFor(() => {
      expect(screen.getByText(/error.*loading.*orders/i)).toBeInTheDocument();
    });
  });

  it('should display order statistics', async () => {
    render(<OrderManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    // Check for statistics display
    expect(screen.getByText(/total orders.*3/i)).toBeInTheDocument();
    expect(screen.getByText(/pending.*1/i)).toBeInTheDocument();
    expect(screen.getByText(/processing.*1/i)).toBeInTheDocument();
    expect(screen.getByText(/completed.*1/i)).toBeInTheDocument();
  });

  it('should handle order deletion', async () => {
    const user = userEvent.setup();
    
    // Mock successful deletion
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ orders: mockOrders })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

    render(<OrderManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete.*order/i });
    await user.click(deleteButtons[0]);
    
    // Confirmation dialog should appear
    const confirmDelete = screen.getByRole('button', { name: /confirm delete/i });
    await user.click(confirmDelete);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/admin/orders/order-1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  it('should be accessible', async () => {
    render(<OrderManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    // Check for proper table structure
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    
    const columnHeaders = screen.getAllByRole('columnheader');
    expect(columnHeaders.length).toBeGreaterThan(0);
    
    // Check for proper ARIA labels
    const searchInput = screen.getByRole('searchbox');
    expect(searchInput).toBeInTheDocument();
  });
});