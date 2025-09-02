import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegisterForm } from '../../../components/auth/RegisterForm';

// Mock the AuthContext
const mockRegister = vi.fn();
const mockClearError = vi.fn();

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    clearError: mockClearError,
    error: null,
    isLoading: false
  })
}));

describe('RegisterForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders register form correctly', () => {
    render(
      <RegisterForm
        onSuccess={mockOnSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    expect(screen.getByText('Account erstellen')).toBeInTheDocument();
    expect(screen.getByLabelText('Vollständiger Name')).toBeInTheDocument();
    expect(screen.getByLabelText('E-Mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Passwort')).toBeInTheDocument();
    expect(screen.getByLabelText('Passwort bestätigen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Account erstellen' })).toBeInTheDocument();
  });

  it('handles form input correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <RegisterForm
        onSuccess={mockOnSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    const nameInput = screen.getByLabelText('Vollständiger Name');
    const emailInput = screen.getByLabelText('E-Mail');
    const passwordInput = screen.getByLabelText('Passwort');
    const confirmPasswordInput = screen.getByLabelText('Passwort bestätigen');

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'SecurePassword123!');
    await user.type(confirmPasswordInput, 'SecurePassword123!');

    expect(nameInput.value).toBe('John Doe');
    expect(emailInput.value).toBe('john@example.com');
    expect(passwordInput.value).toBe('SecurePassword123!');
    expect(confirmPasswordInput.value).toBe('SecurePassword123!');
  });

  it('shows password strength indicator', async () => {
    const user = userEvent.setup();
    
    render(
      <RegisterForm
        onSuccess={mockOnSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    const passwordInput = screen.getByLabelText('Passwort');
    
    // Type weak password
    await user.type(passwordInput, 'weak');
    expect(screen.getByText('schwach')).toBeInTheDocument();
    
    // Clear and type strong password
    await user.clear(passwordInput);
    await user.type(passwordInput, 'SecurePassword123!');
    expect(screen.getByText('sehr stark')).toBeInTheDocument();
  });

  it('validates password confirmation', async () => {
    const user = userEvent.setup();
    
    render(
      <RegisterForm
        onSuccess={mockOnSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    const passwordInput = screen.getByLabelText('Passwort');
    const confirmPasswordInput = screen.getByLabelText('Passwort bestätigen');

    await user.type(passwordInput, 'SecurePassword123!');
    await user.type(confirmPasswordInput, 'DifferentPassword123!');

    expect(screen.getByText('Passwörter stimmen nicht überein')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    
    render(
      <RegisterForm
        onSuccess={mockOnSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    const passwordInput = screen.getByLabelText('Passwort');
    const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button

    expect(passwordInput.type).toBe('password');

    await user.click(toggleButton);
    expect(passwordInput.type).toBe('text');

    await user.click(toggleButton);
    expect(passwordInput.type).toBe('password');
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValueOnce({ success: true });

    render(
      <RegisterForm
        onSuccess={mockOnSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    const nameInput = screen.getByLabelText('Vollständiger Name');
    const emailInput = screen.getByLabelText('E-Mail');
    const passwordInput = screen.getByLabelText('Passwort');
    const confirmPasswordInput = screen.getByLabelText('Passwort bestätigen');
    const submitButton = screen.getByRole('button', { name: 'Account erstellen' });

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'SecurePassword123!');
    await user.type(confirmPasswordInput, 'SecurePassword123!');

    expect(submitButton).not.toBeDisabled();

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePassword123!'
      });
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();

    render(
      <RegisterForm
        onSuccess={mockOnSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Account erstellen' });
    
    // Try to submit empty form
    await user.click(submitButton);

    // Form should not submit and show validation error
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('validates password strength before submission', async () => {
    const user = userEvent.setup();

    render(
      <RegisterForm
        onSuccess={mockOnSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    const nameInput = screen.getByLabelText('Vollständiger Name');
    const emailInput = screen.getByLabelText('E-Mail');
    const passwordInput = screen.getByLabelText('Passwort');
    const confirmPasswordInput = screen.getByLabelText('Passwort bestätigen');
    const submitButton = screen.getByRole('button', { name: 'Account erstellen' });

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'weak');
    await user.type(confirmPasswordInput, 'weak');

    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Passwort ist zu schwach. Bitte wählen Sie ein stärkeres Passwort.')).toBeInTheDocument();
    });

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('handles registration error', async () => {
    const user = userEvent.setup();
    mockRegister.mockRejectedValueOnce(new Error('User already exists'));

    render(
      <RegisterForm
        onSuccess={mockOnSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    const nameInput = screen.getByLabelText('Vollständiger Name');
    const emailInput = screen.getByLabelText('E-Mail');
    const passwordInput = screen.getByLabelText('Passwort');
    const confirmPasswordInput = screen.getByLabelText('Passwort bestätigen');
    const submitButton = screen.getByRole('button', { name: 'Account erstellen' });

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'SecurePassword123!');
    await user.type(confirmPasswordInput, 'SecurePassword123!');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('User already exists')).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('calls switch to login callback', async () => {
    const user = userEvent.setup();

    render(
      <RegisterForm
        onSuccess={mockOnSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    const loginLink = screen.getByRole('button', { name: 'Hier anmelden' });
    await user.click(loginLink);

    expect(mockOnSwitchToLogin).toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed registration response
    mockRegister.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <RegisterForm
        onSuccess={mockOnSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    const nameInput = screen.getByLabelText('Vollständiger Name');
    const emailInput = screen.getByLabelText('E-Mail');
    const passwordInput = screen.getByLabelText('Passwort');
    const confirmPasswordInput = screen.getByLabelText('Passwort bestätigen');
    const submitButton = screen.getByRole('button', { name: 'Account erstellen' });

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'SecurePassword123!');
    await user.type(confirmPasswordInput, 'SecurePassword123!');
    await user.click(submitButton);

    // Check loading state
    expect(screen.getByText('Account wird erstellt...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    expect(nameInput).toBeDisabled();
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(confirmPasswordInput).toBeDisabled();
  });

  it('displays password requirements', () => {
    render(
      <RegisterForm
        onSuccess={mockOnSuccess}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    );

    expect(screen.getByText('Passwort-Anforderungen:')).toBeInTheDocument();
    expect(screen.getByText('Mindestens 8 Zeichen')).toBeInTheDocument();
    expect(screen.getByText('Mindestens ein Großbuchstabe')).toBeInTheDocument();
    expect(screen.getByText('Mindestens ein Kleinbuchstabe')).toBeInTheDocument();
    expect(screen.getByText('Mindestens eine Zahl')).toBeInTheDocument();
    expect(screen.getByText('Mindestens ein Sonderzeichen')).toBeInTheDocument();
  });
});