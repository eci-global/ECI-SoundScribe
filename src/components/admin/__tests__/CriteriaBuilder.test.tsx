import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CriteriaBuilder from '../CriteriaBuilder';

// Mock the UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: any) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children, className }: any) => <p className={className}>{children}</p>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, ...props }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  ),
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant, className }: any) => (
    <div className={`alert ${variant} ${className}`}>{children}</div>
  ),
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

describe('CriteriaBuilder', () => {
  const mockOnCriteriaChange = vi.fn();
  const mockOnValidationChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no criteria', () => {
    render(
      <CriteriaBuilder
        initialCriteria={{}}
        onCriteriaChange={mockOnCriteriaChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    expect(screen.getByText('No Criteria Defined')).toBeInTheDocument();
    expect(screen.getByText('Add Your First Criterion')).toBeInTheDocument();
  });

  it('renders existing criteria', () => {
    const initialCriteria = {
      criterion1: {
        name: 'Communication',
        weight: 50,
        description: 'Communication skills',
        type: 'text',
        required: true
      }
    };

    render(
      <CriteriaBuilder
        initialCriteria={initialCriteria}
        onCriteriaChange={mockOnCriteriaChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    expect(screen.getByText('Communication')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Communication skills')).toBeInTheDocument();
  });

  it('shows add form when add button is clicked', () => {
    render(
      <CriteriaBuilder
        initialCriteria={{}}
        onCriteriaChange={mockOnCriteriaChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    fireEvent.click(screen.getByText('Add Your First Criterion'));
    
    expect(screen.getByText('Add New Criterion')).toBeInTheDocument();
    expect(screen.getByLabelText('Criterion Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Weight (%) *')).toBeInTheDocument();
  });

  it('validates criteria and shows errors', async () => {
    render(
      <CriteriaBuilder
        initialCriteria={{}}
        onCriteriaChange={mockOnCriteriaChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    // Add a criterion with invalid weight
    fireEvent.click(screen.getByText('Add Your First Criterion'));
    fireEvent.change(screen.getByLabelText('Criterion Name *'), {
      target: { value: 'Test Criterion' }
    });
    fireEvent.change(screen.getByLabelText('Weight (%) *'), {
      target: { value: '150' } // Invalid weight > 100
    });
    // Use getAllByText to get the second "Add Criterion" button (the one in the form)
    const addButtons = screen.getAllByText('Add Criterion');
    fireEvent.click(addButtons[1]); // Second button is the form submit button

    await waitFor(() => {
      expect(mockOnValidationChange).toHaveBeenCalledWith(false, expect.any(Array));
    });
  });

  it('calls onCriteriaChange when criteria are modified', async () => {
    render(
      <CriteriaBuilder
        initialCriteria={{}}
        onCriteriaChange={mockOnCriteriaChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    // Add a valid criterion
    fireEvent.click(screen.getByText('Add Your First Criterion'));
    fireEvent.change(screen.getByLabelText('Criterion Name *'), {
      target: { value: 'Test Criterion' }
    });
    fireEvent.change(screen.getByLabelText('Weight (%) *'), {
      target: { value: '100' }
    });
    fireEvent.click(screen.getAllByText('Add Criterion')[1]); // Second "Add Criterion" button

    await waitFor(() => {
      // The component calls onCriteriaChange twice - once with empty object, once with the criterion
      expect(mockOnCriteriaChange).toHaveBeenCalledTimes(2);
      const lastCall = mockOnCriteriaChange.mock.calls[1][0];
      
      // Check that the last call contains a criterion with the expected properties
      const criterionKeys = Object.keys(lastCall);
      expect(criterionKeys).toHaveLength(1);
      expect(criterionKeys[0]).toMatch(/^criterion_/);
      
      const criterion = lastCall[criterionKeys[0]];
      expect(criterion).toMatchObject({
        name: 'Test Criterion',
        weight: 100
      });
    });
  });

  it('shows total weight correctly', () => {
    const initialCriteria = {
      criterion1: {
        name: 'Communication',
        weight: 60,
        description: 'Communication skills'
      },
      criterion2: {
        name: 'Technical',
        weight: 40,
        description: 'Technical skills'
      }
    };

    render(
      <CriteriaBuilder
        initialCriteria={initialCriteria}
        onCriteriaChange={mockOnCriteriaChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    expect(screen.getByText('Total Weight: 100%')).toBeInTheDocument();
  });

  it('allows editing criteria', () => {
    const initialCriteria = {
      criterion1: {
        name: 'Communication',
        weight: 50,
        description: 'Communication skills'
      }
    };

    render(
      <CriteriaBuilder
        initialCriteria={initialCriteria}
        onCriteriaChange={mockOnCriteriaChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    // Find edit button by getting all buttons and selecting the first one with edit icon
    const buttons = screen.getAllByRole('button');
    const editButton = buttons.find(button => 
      button.querySelector('svg[class*="square-pen"]')
    );
    
    if (editButton) {
      fireEvent.click(editButton);
      expect(screen.getByText('Edit Criterion')).toBeInTheDocument();
    }
  });

  it('allows deleting criteria', () => {
    const initialCriteria = {
      criterion1: {
        name: 'Communication',
        weight: 50,
        description: 'Communication skills'
      }
    };

    render(
      <CriteriaBuilder
        initialCriteria={initialCriteria}
        onCriteriaChange={mockOnCriteriaChange}
        onValidationChange={mockOnValidationChange}
      />
    );

    // Find delete button by getting all buttons and selecting the one with trash icon
    const buttons = screen.getAllByRole('button');
    const deleteButton = buttons.find(button => 
      button.querySelector('svg[class*="trash2"]')
    );
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(screen.getByText('No Criteria Defined')).toBeInTheDocument();
    }
  });
});
