import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/render';
import userEvent from '@testing-library/user-event';
import Auth from '../Auth';
import { resetSupabaseMocks } from '@/test/mocks/supabase';
import { defaultMockUser, defaultMockSession } from '@/test/mocks/auth-context';
import * as profileUtils from '@/lib/profile-utils';

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, vi.fn()],
  };
});

const mockNavigate = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('@/lib/profile-utils', () => ({
  isProfileComplete: vi.fn(),
  hasSeenWelcome: vi.fn(),
  updateProfile: vi.fn(),
}));

describe('Auth - Signup Scenarios', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
    mockSearchParams.delete('checkout');
    mockSearchParams.delete('plan');
    mockSearchParams.delete('redirect');
    mockSearchParams.delete('signup');
    mockSearchParams.delete('reset');
    
    // Default to signup mode
    mockSearchParams.set('signup', 'true');
  });

  describe('Cenário 1: Cadastro Completo (Sucesso)', () => {
    it('should complete signup and redirect to /welcome', async () => {
      const user = userEvent.setup();

      const mockSignUp = vi.fn().mockResolvedValue({ error: null });
      const mockSignIn = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(profileUtils.updateProfile).mockResolvedValue({ error: null });

      render(<Auth />, {
        authOverrides: {
          user: defaultMockUser,
          session: defaultMockSession,
          signUp: mockSignUp,
          signIn: mockSignIn,
        },
      });

      // Switch to signup tab
      const signupTab = screen.getByRole('tab', { name: /cadastre-se/i });
      await user.click(signupTab);

      // Fill all fields
      const fullNameInput = screen.getByPlaceholderText(/nome completo/i);
      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const cpfInput = screen.getByPlaceholderText(/000\.000\.000-00/i);
      const phoneInput = screen.getByPlaceholderText(/\(00\) 00000-0000/i);
      const passwordInputs = screen.getAllByPlaceholderText(/sua senha/i);

      await user.type(fullNameInput, 'João Silva');
      await user.type(emailInput, 'joao@example.com');
      await user.type(cpfInput, '12345678909');
      await user.type(phoneInput, '11999887766');
      await user.type(passwordInputs[0], 'password123');
      await user.type(passwordInputs[1], 'password123');

      // Select service type
      const serviceSelect = screen.getByRole('combobox');
      await user.click(serviceSelect);
      const motorbikeOption = await screen.findByText(/entregador de moto/i);
      await user.click(motorbikeOption);

      // Submit
      const signupButton = screen.getByRole('button', { name: /criar conta/i });
      await user.click(signupButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled();
        expect(mockSignIn).toHaveBeenCalled();
        expect(profileUtils.updateProfile).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/welcome');
      }, { timeout: 3000 });
    });
  });

  describe('Cenário 2: Senha Fraca', () => {
    it('should show validation error for password less than 6 chars', async () => {
      const user = userEvent.setup();

      render(<Auth />, {
        authOverrides: {},
      });

      const signupTab = screen.getByRole('tab', { name: /cadastre-se/i });
      await user.click(signupTab);

      const passwordInputs = screen.getAllByPlaceholderText(/sua senha/i);
      await user.type(passwordInputs[0], '12345'); // Only 5 chars

      const signupButton = screen.getByRole('button', { name: /criar conta/i });
      await user.click(signupButton);

      await waitFor(() => {
        expect(screen.getByText(/pelo menos 6 caracteres/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cenário 3: Email Já Cadastrado', () => {
    it('should show error when email already registered', async () => {
      const user = userEvent.setup();

      const mockSignUp = vi
        .fn()
        .mockResolvedValue({ error: { message: 'User already registered' } });

      render(<Auth />, {
        authOverrides: {
          signUp: mockSignUp,
        },
      });

      const signupTab = screen.getByRole('tab', { name: /cadastre-se/i });
      await user.click(signupTab);

      // Fill minimal required fields
      const fullNameInput = screen.getByPlaceholderText(/nome completo/i);
      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const cpfInput = screen.getByPlaceholderText(/000\.000\.000-00/i);
      const phoneInput = screen.getByPlaceholderText(/\(00\) 00000-0000/i);
      const passwordInputs = screen.getAllByPlaceholderText(/sua senha/i);

      await user.type(fullNameInput, 'João Silva');
      await user.type(emailInput, 'existing@example.com');
      await user.type(cpfInput, '12345678909');
      await user.type(phoneInput, '11999887766');
      await user.type(passwordInputs[0], 'password123');
      await user.type(passwordInputs[1], 'password123');

      const serviceSelect = screen.getByRole('combobox');
      await user.click(serviceSelect);
      const option = await screen.findByText(/entregador de moto/i);
      await user.click(option);

      const signupButton = screen.getByRole('button', { name: /criar conta/i });
      await user.click(signupButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalled();
      });
    });
  });

  describe('Cenário 4: CPF Inválido', () => {
    it('should show validation error for invalid CPF digits', async () => {
      const user = userEvent.setup();

      render(<Auth />, {
        authOverrides: {},
      });

      const signupTab = screen.getByRole('tab', { name: /cadastre-se/i });
      await user.click(signupTab);

      const cpfInput = screen.getByPlaceholderText(/000\.000\.000-00/i);
      await user.type(cpfInput, '11111111111'); // Invalid CPF

      const signupButton = screen.getByRole('button', { name: /criar conta/i });
      await user.click(signupButton);

      await waitFor(() => {
        expect(screen.getByText(/cpf inválido/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cenário 5: Senhas Não Conferem', () => {
    it('should show error when passwords do not match', async () => {
      const user = userEvent.setup();

      render(<Auth />, {
        authOverrides: {},
      });

      const signupTab = screen.getByRole('tab', { name: /cadastre-se/i });
      await user.click(signupTab);

      const passwordInputs = screen.getAllByPlaceholderText(/sua senha/i);
      await user.type(passwordInputs[0], 'password123');
      await user.type(passwordInputs[1], 'different456');

      const signupButton = screen.getByRole('button', { name: /criar conta/i });
      await user.click(signupButton);

      await waitFor(() => {
        expect(screen.getByText(/as senhas não coincidem/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cenário 6: Cadastro via Checkout', () => {
    it('should redirect to checkout after signup when checkout=true', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('checkout', 'true');
      mockSearchParams.set('plan', 'bronze');

      const mockSignUp = vi.fn().mockResolvedValue({ error: null });
      const mockSignIn = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(profileUtils.updateProfile).mockResolvedValue({ error: null });

      render(<Auth />, {
        authOverrides: {
          user: defaultMockUser,
          session: defaultMockSession,
          signUp: mockSignUp,
          signIn: mockSignIn,
        },
      });

      const signupTab = screen.getByRole('tab', { name: /cadastre-se/i });
      await user.click(signupTab);

      // Fill all required fields
      const fullNameInput = screen.getByPlaceholderText(/nome completo/i);
      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const cpfInput = screen.getByPlaceholderText(/000\.000\.000-00/i);
      const phoneInput = screen.getByPlaceholderText(/\(00\) 00000-0000/i);
      const passwordInputs = screen.getAllByPlaceholderText(/sua senha/i);

      await user.type(fullNameInput, 'João Silva');
      await user.type(emailInput, 'joao@example.com');
      await user.type(cpfInput, '12345678909');
      await user.type(phoneInput, '11999887766');
      await user.type(passwordInputs[0], 'password123');
      await user.type(passwordInputs[1], 'password123');

      const serviceSelect = screen.getByRole('combobox');
      await user.click(serviceSelect);
      const option = await screen.findByText(/entregador de moto/i);
      await user.click(option);

      const signupButton = screen.getByRole('button', { name: /criar conta/i });
      await user.click(signupButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/?checkout=true&plan=bronze');
      }, { timeout: 3000 });
    });
  });
});
