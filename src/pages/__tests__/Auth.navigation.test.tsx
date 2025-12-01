import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/utils/render';
import Auth from '../Auth';
import { resetSupabaseMocks } from '@/test/mocks/supabase';
import { defaultMockUser, defaultMockSession } from '@/test/mocks/auth-context';

// Mock dependencies - declare before vi.mock
const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, vi.fn()],
  };
});

const mockIsProfileComplete = vi.fn();
const mockHasSeenWelcome = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock('@/lib/profile-utils', () => ({
  isProfileComplete: mockIsProfileComplete,
  hasSeenWelcome: mockHasSeenWelcome,
  updateProfile: mockUpdateProfile,
}));

describe('Auth - Navigation Race Conditions', () => {
  beforeEach(() => {
    resetSupabaseMocks();
    vi.clearAllMocks();
    mockSearchParams.delete('checkout');
    mockSearchParams.delete('plan');
    mockSearchParams.delete('redirect');
    mockSearchParams.delete('signup');
    mockSearchParams.delete('reset');
  });

  describe('Race Condition Prevention', () => {
    it('should not navigate twice when useEffect and handleLogin both try to redirect', async () => {
      mockIsProfileComplete.mockResolvedValue(true);
      mockHasSeenWelcome.mockResolvedValue(true);

      // User is already authenticated
      render(<Auth />, {
        authOverrides: {
          user: defaultMockUser,
          session: defaultMockSession,
          loading: false,
        },
      });

      await waitFor(() => {
        // Should only navigate once via useEffect
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/meu-corre');
      });
    });

    it('should use hasNavigatedRef to prevent duplicate navigation in useEffect', async () => {
      mockIsProfileComplete.mockResolvedValue(true);
      mockHasSeenWelcome.mockResolvedValue(true);

      // Simulate authenticated user
      render(<Auth />, {
        authOverrides: {
          user: defaultMockUser,
          session: defaultMockSession,
          loading: false,
        },
      });

      // Wait for useEffect to complete
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });

      // Even if useEffect runs multiple times, should only navigate once
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('should respect cancelled flag in useEffect cleanup', async () => {
      mockIsProfileComplete.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
      );

      const { unmount } = render(<Auth />, {
        authOverrides: {
          user: defaultMockUser,
          session: defaultMockSession,
          loading: false,
        },
      });

      // Unmount before async operations complete
      unmount();

      // Wait a bit to ensure async operations would have completed
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should not navigate after unmount
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Priority-Based Navigation', () => {
    it('should prioritize checkout over redirect param', async () => {
      mockSearchParams.set('checkout', 'true');
      mockSearchParams.set('plan', 'bronze');
      mockSearchParams.set('redirect', '/meu-corre');

      mockIsProfileComplete.mockResolvedValue(true);

      render(<Auth />, {
        authOverrides: {
          user: defaultMockUser,
          session: defaultMockSession,
          loading: false,
        },
      });

      await waitFor(() => {
        // Should navigate to checkout, not redirect
        expect(mockNavigate).toHaveBeenCalledWith('/?checkout=true&plan=bronze');
      });
    });

    it('should prioritize onboarding when profile incomplete regardless of redirect', async () => {
      mockSearchParams.set('redirect', '/meu-corre');
      mockIsProfileComplete.mockResolvedValue(false);

      render(<Auth />, {
        authOverrides: {
          user: defaultMockUser,
          session: defaultMockSession,
          loading: false,
        },
      });

      await waitFor(() => {
        // Should navigate to onboarding first
        expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('should follow normal flow when no special params present', async () => {
      mockIsProfileComplete.mockResolvedValue(true);
      mockHasSeenWelcome.mockResolvedValue(true);

      render(<Auth />, {
        authOverrides: {
          user: defaultMockUser,
          session: defaultMockSession,
          loading: false,
        },
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/meu-corre');
      });
    });
  });
});
