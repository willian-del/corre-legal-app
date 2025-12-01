import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils/render';
import userEvent from '@testing-library/user-event';
import Auth from '../Auth';
import { resetSupabaseMocks } from '@/test/mocks/supabase';

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

describe('Auth - Form Validation', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
  });

  describe('Login Form Validation', () => {
    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();

      render(<Auth />, {
        authOverrides: {},
      });

      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const loginButton = screen.getByRole('button', { name: /entrar/i });

      await user.type(emailInput, 'invalidemail');
      await user.click(loginButton);

      expect(await screen.findByText(/email inválido/i)).toBeInTheDocument();
    });

    it('should show error for password less than 6 characters', async () => {
      const user = userEvent.setup();

      render(<Auth />, {
        authOverrides: {},
      });

      const passwordInput = screen.getByPlaceholderText(/sua senha/i);
      const loginButton = screen.getByRole('button', { name: /entrar/i });

      await user.type(passwordInput, '12345');
      await user.click(loginButton);

      expect(await screen.findByText(/pelo menos 6 caracteres/i)).toBeInTheDocument();
    });
  });

  describe('SignUp Form Validation', () => {
    beforeEach(async () => {
      const { container } = render(<Auth />, {
        authOverrides: {},
      });
      
      // Switch to signup tab
      const user = userEvent.setup();
      const signupTab = screen.getByRole('tab', { name: /cadastre-se/i });
      await user.click(signupTab);
    });

    it('should show error for invalid email format', async () => {
      const user = userEvent.setup();

      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const signupButton = screen.getByRole('button', { name: /criar conta/i });

      await user.type(emailInput, 'invalidemail');
      await user.click(signupButton);

      expect(await screen.findByText(/email inválido/i)).toBeInTheDocument();
    });

    it('should show error for name less than 3 characters', async () => {
      const user = userEvent.setup();

      const nameInput = screen.getByPlaceholderText(/nome completo/i);
      const signupButton = screen.getByRole('button', { name: /criar conta/i });

      await user.type(nameInput, 'Jo');
      await user.click(signupButton);

      expect(await screen.findByText(/pelo menos 3 caracteres/i)).toBeInTheDocument();
    });

    it('should show error for invalid CPF format', async () => {
      const user = userEvent.setup();

      const cpfInput = screen.getByPlaceholderText(/000\.000\.000-00/i);
      const signupButton = screen.getByRole('button', { name: /criar conta/i });

      await user.type(cpfInput, '11111111111'); // Invalid CPF (all same digits)
      await user.click(signupButton);

      expect(await screen.findByText(/cpf inválido/i)).toBeInTheDocument();
    });

    it('should show error for invalid phone format', async () => {
      const user = userEvent.setup();

      const phoneInput = screen.getByPlaceholderText(/\(00\) 00000-0000/i);
      const signupButton = screen.getByRole('button', { name: /criar conta/i });

      await user.type(phoneInput, '123'); // Too short
      await user.click(signupButton);

      expect(await screen.findByText(/telefone inválido/i)).toBeInTheDocument();
    });

    it('should show error for missing service type', async () => {
      const user = userEvent.setup();

      // Fill other fields but leave service type empty
      const nameInput = screen.getByPlaceholderText(/nome completo/i);
      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const cpfInput = screen.getByPlaceholderText(/000\.000\.000-00/i);
      const phoneInput = screen.getByPlaceholderText(/\(00\) 00000-0000/i);
      const passwordInputs = screen.getAllByPlaceholderText(/sua senha/i);

      await user.type(nameInput, 'João Silva');
      await user.type(emailInput, 'joao@example.com');
      await user.type(cpfInput, '12345678909');
      await user.type(phoneInput, '11999887766');
      await user.type(passwordInputs[0], 'password123');
      await user.type(passwordInputs[1], 'password123');

      const signupButton = screen.getByRole('button', { name: /criar conta/i });
      await user.click(signupButton);

      expect(await screen.findByText(/selecione o tipo de serviço/i)).toBeInTheDocument();
    });

    it('should show error for mismatched passwords', async () => {
      const user = userEvent.setup();

      const passwordInputs = screen.getAllByPlaceholderText(/sua senha/i);
      const signupButton = screen.getByRole('button', { name: /criar conta/i });

      await user.type(passwordInputs[0], 'password123');
      await user.type(passwordInputs[1], 'different456');
      await user.click(signupButton);

      expect(await screen.findByText(/as senhas não coincidem/i)).toBeInTheDocument();
    });
  });
});
