import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManualViewer } from '../../src/components/customer/ManualViewer.jsx';

// Mock fetch
global.fetch = vi.fn();

describe('ManualViewer', () => {
  const mockManual = {
    id: 'manual-123',
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fetch.mockClear();
  });

  it('should render manual title', () => {
    render(<ManualViewer manual={mockManual} />);
    
    expect(screen.getByText('DIY Humanoid Assembly Manual')).toBeInTheDocument();
  });

  it('should display manual metadata', () => {
    render(<ManualViewer manual={mockManual} />);
    
    expect(screen.getByText('Estimated Time: 4-6 hours')).toBeInTheDocument();
    expect(screen.getByText('Difficulty: Intermediate')).toBeInTheDocument();
  });

  it('should render all sections', () => {
    render(<ManualViewer manual={mockManual} />);
    
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Assembly Instructions')).toBeInTheDocument();
    expect(screen.getByText('Welcome to your DIY humanoid project...')).toBeInTheDocument();
  });

  it('should render assembly steps', () => {
    render(<ManualViewer manual={mockManual} />);
    
    expect(screen.getByText('1. Connect servo motor to Arduino')).toBeInTheDocument();
    expect(screen.getByText('2. Upload control software')).toBeInTheDocument();
  });

  it('should display safety notes', () => {
    render(<ManualViewer manual={mockManual} />);
    
    expect(screen.getByText('Safety Notes')).toBeInTheDocument();
    expect(screen.getByText('Always disconnect power when wiring')).toBeInTheDocument();
    expect(screen.getByText('Use proper ESD protection')).toBeInTheDocument();
  });

  it('should handle missing manual gracefully', () => {
    render(<ManualViewer manual={null} />);
    
    expect(screen.getByText('No manual available')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<ManualViewer loading={true} />);
    
    expect(screen.getByText('Loading manual...')).toBeInTheDocument();
  });

  it('should handle print functionality', () => {
    // Mock window.print
    const mockPrint = vi.fn();
    Object.defineProperty(window, 'print', {
      value: mockPrint,
      writable: true
    });

    render(<ManualViewer manual={mockManual} />);
    
    const printButton = screen.getByText('Print Manual');
    fireEvent.click(printButton);
    
    expect(mockPrint).toHaveBeenCalled();
  });

  it('should handle download functionality', async () => {
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

    render(<ManualViewer manual={mockManual} />);
    
    const downloadButton = screen.getByText('Download PDF');
    fireEvent.click(downloadButton);
    
    await waitFor(() => {
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAnchor.download).toBe('DIY_Humanoid_Assembly_Manual.pdf');
      expect(mockClick).toHaveBeenCalled();
    });
  });

  it('should handle section navigation', () => {
    render(<ManualViewer manual={mockManual} />);
    
    // Find navigation buttons
    const introButton = screen.getByRole('button', { name: /introduction/i });
    const assemblyButton = screen.getByRole('button', { name: /assembly instructions/i });
    
    expect(introButton).toBeInTheDocument();
    expect(assemblyButton).toBeInTheDocument();
    
    // Click navigation should work (assuming implementation exists)
    fireEvent.click(assemblyButton);
  });

  it('should render with custom CSS classes', () => {
    render(<ManualViewer manual={mockManual} className="custom-manual-viewer" />);
    
    const container = screen.getByTestId('manual-viewer');
    expect(container).toHaveClass('custom-manual-viewer');
  });

  it('should handle step completion tracking', () => {
    render(<ManualViewer manual={mockManual} enableStepTracking={true} />);
    
    const stepCheckboxes = screen.getAllByRole('checkbox');
    expect(stepCheckboxes).toHaveLength(2); // Two steps in assembly section
    
    // Mark first step as complete
    fireEvent.click(stepCheckboxes[0]);
    expect(stepCheckboxes[0]).toBeChecked();
  });

  it('should show progress indicator when step tracking enabled', () => {
    render(<ManualViewer manual={mockManual} enableStepTracking={true} />);
    
    expect(screen.getByText(/progress/i)).toBeInTheDocument();
    expect(screen.getByText('0 of 2 steps completed')).toBeInTheDocument();
  });

  it('should handle empty sections gracefully', () => {
    const manualWithEmptySections = {
      ...mockManual,
      sections: []
    };
    
    render(<ManualViewer manual={manualWithEmptySections} />);
    
    expect(screen.getByText('DIY Humanoid Assembly Manual')).toBeInTheDocument();
    expect(screen.getByText('No assembly instructions available')).toBeInTheDocument();
  });

  it('should handle error state', () => {
    render(<ManualViewer manual={mockManual} error="Failed to load manual" />);
    
    expect(screen.getByText('Error: Failed to load manual')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(<ManualViewer manual={mockManual} />);
    
    // Check for proper heading hierarchy
    const mainHeading = screen.getByRole('heading', { level: 1 });
    expect(mainHeading).toBeInTheDocument();
    
    const sectionHeadings = screen.getAllByRole('heading', { level: 2 });
    expect(sectionHeadings).toHaveLength(2);
    
    // Check for proper ARIA labels
    const manualContainer = screen.getByTestId('manual-viewer');
    expect(manualContainer).toHaveAttribute('role', 'main');
  });
});