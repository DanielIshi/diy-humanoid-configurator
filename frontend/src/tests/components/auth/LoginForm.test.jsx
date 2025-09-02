import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../../../components/auth/LoginForm';
import { AuthProvider } from '../../../contexts/AuthContext';

// Mock the AuthContext
const mockLogin = vi.fn();
const mockClearError = vi.fn();

vi.mock('../../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    login: mockLogin,
    clearError: mockClearError,
    error: null,
    isLoading: false
  })
}));

describe('LoginForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnSwitchToRegister = vi.fn();
  const mockOnSwitchToForgotPassword = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(
      <LoginForm
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    );

    expect(screen.getByText('Anmelden')).toBeInTheDocument();
    expect(screen.getByLabelText('E-Mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Passwort')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anmelden' })).toBeInTheDocument();
  });

  it('handles form input correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <LoginForm
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    );

    const emailInput = screen.getByLabelText('E-Mail');
    const passwordInput = screen.getByLabelText('Passwort');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce({ success: true });

    render(
      <LoginForm
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    );

    const emailInput = screen.getByLabelText('E-Mail');
    const passwordInput = screen.getByLabelText('Passwort');
    const submitButton = screen.getByRole('button', { name: 'Anmelden' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('disables submit button when form is empty', () => {
    render(
      <LoginForm
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Anmelden' });
    expect(submitButton).toBeDisabled();
  });

  it('handles login error', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

    render(
      <LoginForm
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    );

    const emailInput = screen.getByLabelText('E-Mail');
    const passwordInput = screen.getByLabelText('Passwort');
    const submitButton = screen.getByRole('button', { name: 'Anmelden' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('calls switch to register callback', async () => {
    const user = userEvent.setup();

    render(
      <LoginForm
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    );

    const registerLink = screen.getByRole('button', { name: 'Hier registrieren' });
    await user.click(registerLink);

    expect(mockOnSwitchToRegister).toHaveBeenCalled();
  });

  it('calls switch to forgot password callback', async () => {
    const user = userEvent.setup();

    render(
      <LoginForm
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    );

    const forgotPasswordLink = screen.getByRole('button', { name: 'Passwort vergessen?' });
    await user.click(forgotPasswordLink);

    expect(mockOnSwitchToForgotPassword).toHaveBeenCalled();
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed login response
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <LoginForm
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    );

    const emailInput = screen.getByLabelText('E-Mail');
    const passwordInput = screen.getByLabelText('Passwort');
    const submitButton = screen.getByRole('button', { name: 'Anmelden' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    // Check loading state
    expect(screen.getByText('Anmelden...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
  });

  it('clears error when user starts typing', async () => {
    const user = userEvent.setup();

    render(
      <LoginForm
        onSuccess={mockOnSuccess}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    );

    const emailInput = screen.getByLabelText('E-Mail');
    
    await user.type(emailInput, 't');

    expect(mockClearError).toHaveBeenCalled();
  });
});