import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/dom';
import { render } from '@/test/utils/render';
import userEvent from '@testing-library/user-event';
import Auth from '../Auth';
import { mockSupabaseAuth, resetSupabaseMocks } from '@/test/mocks/supabase';
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

describe('Auth - Login Scenarios', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
    mockSearchParams.delete('checkout');
    mockSearchParams.delete('plan');
    mockSearchParams.delete('redirect');
    mockSearchParams.delete('signup');
    mockSearchParams.delete('reset');
  });

  describe('Cenário 1: Login Normal (Sucesso)', () => {
    it('should login and redirect to /meu-corre when profile is complete and user has seen welcome', async () => {
      const user = userEvent.setup();

      // Mock successful login
      const mockSignIn = vi.fn().mockResolvedValue({ error: null });
      
      // Mock profile complete and welcome seen
      vi.mocked(profileUtils.isProfileComplete).mockResolvedValue(true);
      vi.mocked(profileUtils.hasSeenWelcome).mockResolvedValue(true);

      render(<Auth />, {
        authOverrides: {
          user: defaultMockUser,
          session: defaultMockSession,
          signIn: mockSignIn,
        },
      });

      // Fill in login form
      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const passwordInput = screen.getByPlaceholderText(/sua senha/i);
      const loginButton = screen.getByRole('button', { name: /entrar/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(mockNavigate).toHaveBeenCalledWith('/meu-corre');
      });
    });

    it('should redirect to /welcome when user has not seen welcome', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi.fn().mockResolvedValue({ error: null });

      vi.mocked(profileUtils.isProfileComplete).mockResolvedValue(true);
      vi.mocked(profileUtils.hasSeenWelcome).mockResolvedValue(false);

      render(<Auth />, {
        authOverrides: {
          user: defaultMockUser,
          session: defaultMockSession,
          signIn: mockSignIn,
        },
      });

      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const passwordInput = screen.getByPlaceholderText(/sua senha/i);
      const loginButton = screen.getByRole('button', { name: /entrar/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/welcome');
      });
    });
  });

  describe('Cenário 2: Login com Credenciais Inválidas', () => {
    it('should show error message for invalid credentials', async () => {
      const user = userEvent.setup();
      const mockSignIn = vi
        .fn()
        .mockResolvedValue({ error: { message: 'Invalid login credentials' } });

      render(<Auth />, {
        authOverrides: {
          signIn: mockSignIn,
        },
      });

      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const passwordInput = screen.getByPlaceholderText(/sua senha/i);
      const loginButton = screen.getByRole('button', { name: /entrar/i });

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });

  describe('Cenário 3: Login via Checkout', () => {
    it('should redirect to checkout flow when checkout=true&plan=bronze', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('checkout', 'true');
      mockSearchParams.set('plan', 'bronze');

      const mockSignIn = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(profileUtils.isProfileComplete).mockResolvedValue(true);

      render(<Auth />, {
        authOverrides: {
          user: defaultMockUser,
          session: defaultMockSession,
          signIn: mockSignIn,
        },
      });

      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const passwordInput = screen.getByPlaceholderText(/sua senha/i);
      const loginButton = screen.getByRole('button', { name: /entrar/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/?checkout=true&plan=bronze');
      });
    });
  });

  describe('Cenário 4: Login com Redirect Param', () => {
    it('should follow redirect param when profile is complete', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('redirect', '/meu-corre');

      const mockSignIn = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(profileUtils.isProfileComplete).mockResolvedValue(true);

      render(<Auth />, {
        authOverrides: {
          user: defaultMockUser,
          session: defaultMockSession,
          signIn: mockSignIn,
        },
      });

      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const passwordInput = screen.getByPlaceholderText(/sua senha/i);
      const loginButton = screen.getByRole('button', { name: /entrar/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/meu-corre');
      });
    });

    it('should go to onboarding when redirect exists but profile incomplete', async () => {
      const user = userEvent.setup();
      mockSearchParams.set('redirect', '/meu-corre');

      const mockSignIn = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(profileUtils.isProfileComplete).mockResolvedValue(false);

      render(<Auth />, {
        authOverrides: {
          user: defaultMockUser,
          session: defaultMockSession,
          signIn: mockSignIn,
        },
      });

      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const passwordInput = screen.getByPlaceholderText(/sua senha/i);
      const loginButton = screen.getByRole('button', { name: /entrar/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
      });
    });
  });

  describe('Cenário 5: Login com Perfil Incompleto', () => {
    it('should redirect to onboarding when profile is incomplete', async () => {
      const user = userEvent.setup();

      const mockSignIn = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(profileUtils.isProfileComplete).mockResolvedValue(false);

      render(<Auth />, {
        authOverrides: {
          user: defaultMockUser,
          session: defaultMockSession,
          signIn: mockSignIn,
        },
      });

      const emailInput = screen.getByPlaceholderText(/seu@email.com/i);
      const passwordInput = screen.getByPlaceholderText(/sua senha/i);
      const loginButton = screen.getByRole('button', { name: /entrar/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
      });
    });
  });
});
