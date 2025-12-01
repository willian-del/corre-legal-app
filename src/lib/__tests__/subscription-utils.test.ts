import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkActiveSubscription, getActiveSubscription } from '../subscription-utils';
import { mockSupabase, resetSupabaseMocks } from '@/test/mocks/supabase';

describe('subscription-utils', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe('checkActiveSubscription', () => {
    it('should return true when user has active subscription', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null,
      });

      const result = await checkActiveSubscription('user-123');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('has_active_subscription', {
        _user_id: 'user-123',
      });
      expect(result).toBe(true);
    });

    it('should return false when user has no active subscription', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: false,
        error: null,
      });

      const result = await checkActiveSubscription('user-456');

      expect(result).toBe(false);
    });

    it('should return false when RPC call fails', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await checkActiveSubscription('user-789');

      expect(result).toBe(false);
    });

    it('should return false when exception is thrown', async () => {
      mockSupabase.rpc.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkActiveSubscription('user-error');

      expect(result).toBe(false);
    });
  });

  describe('getActiveSubscription', () => {
    it('should return subscription data when user has active subscription', async () => {
      const mockSubscription = {
        id: 'sub-123',
        plan_type: 'quarterly',
        status: 'active',
        expires_at: '2025-03-01T00:00:00Z',
        days_remaining: 90,
        payment_method: 'credit_card',
        amount_paid: 60.0,
      };

      mockSupabase.rpc.mockResolvedValueOnce({
        data: [mockSubscription],
        error: null,
      });

      const result = await getActiveSubscription('user-123');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_active_subscription', {
        _user_id: 'user-123',
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should return null when user has no active subscription', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await getActiveSubscription('user-456');

      expect(result).toBeNull();
    });

    it('should return null when RPC call fails', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getActiveSubscription('user-789');

      expect(result).toBeNull();
    });

    it('should return null when exception is thrown', async () => {
      mockSupabase.rpc.mockRejectedValueOnce(new Error('Network error'));

      const result = await getActiveSubscription('user-error');

      expect(result).toBeNull();
    });
  });
});
