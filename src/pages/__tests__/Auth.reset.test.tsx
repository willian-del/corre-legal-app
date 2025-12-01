import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/dom';
import { render } from '@/test/utils/render';
import userEvent from '@testing-library/user-event';
import Auth from '../Auth';
import { mockSupabaseAuth, resetSupabaseMocks } from '@/test/mocks/supabase';

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

describe('Auth - Password Reset Scenarios', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
    mockSearchParams.delete('checkout');
    mockSearchParams.delete('plan');
    mockSearchParams.delete('redirect');
    mockSearchParams.delete('signup');
    mockSearchParams.delete('reset');
  });

  describe('Cenário 1: Solicitar Reset de Senha (Sucesso)', () => {
    it('should send password reset email successfully', async () => {
      const user = userEvent.setup();

      mockSupabaseAuth.resetPasswordForEmail.mockResolvedValue({ error: null });

      render(<Auth />, {
        authOverrides: {},
      });

      // Click "Esqueci minha senha"
      const forgotPasswordLink = screen.getByText(/esqueci minha senha/i);
      await user.click(forgotPasswordLink);

      // Enter email
      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      await user.type(emailInput, 'test@example.com');

      // Submit
      const sendButton = screen.getByRole('button', { name: /enviar link/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockSupabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
          'test@example.com',
          expect.objectContaining({
            redirectTo: expect.stringContaining('/auth?reset=true'),
          })
        );
      });
    });
  });

  describe('Cenário 2: Atualizar Senha (Sucesso)', () => {
    it('should update password successfully and redirect', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('reset', 'true');

      mockSupabaseAuth.updateUser.mockResolvedValue({ 
        data: { user: {} },
        error: null 
      });

      render(<Auth />, {
        authOverrides: {},
      });

      // Should show new password form
      const passwordInputs = screen.getAllByPlaceholderText(/nova senha/i);
      expect(passwordInputs).toHaveLength(2);

      await user.type(passwordInputs[0], 'newpassword123');
      await user.type(passwordInputs[1], 'newpassword123');

      const updateButton = screen.getByRole('button', { name: /atualizar senha/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockSupabaseAuth.updateUser).toHaveBeenCalledWith({
          password: 'newpassword123',
        });
        expect(mockNavigate).toHaveBeenCalled();
      });
    });
  });

  describe('Cenário 3: Senhas Não Conferem no Reset', () => {
    it('should show error when new passwords do not match', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('reset', 'true');

      render(<Auth />, {
        authOverrides: {},
      });

      const passwordInputs = screen.getAllByPlaceholderText(/nova senha/i);
      await user.type(passwordInputs[0], 'newpassword123');
      await user.type(passwordInputs[1], 'differentpassword');

      const updateButton = screen.getByRole('button', { name: /atualizar senha/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/as senhas não coincidem/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cenário 4: Senha Muito Curta no Reset', () => {
    it('should show error for password less than 6 characters', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('reset', 'true');

      render(<Auth />, {
        authOverrides: {},
      });

      const passwordInputs = screen.getAllByPlaceholderText(/nova senha/i);
      await user.type(passwordInputs[0], '12345'); // Only 5 chars
      await user.type(passwordInputs[1], '12345');

      const updateButton = screen.getByRole('button', { name: /atualizar senha/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/pelo menos 6 caracteres/i)).toBeInTheDocument();
      });
    });
  });
});
