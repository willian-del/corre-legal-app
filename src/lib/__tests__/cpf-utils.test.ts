import { describe, it, expect } from 'vitest';
import { isValidCPF, formatCPF } from '../cpf-utils';

describe('cpf-utils', () => {
  describe('isValidCPF', () => {
    it('should validate a correct CPF', () => {
      expect(isValidCPF('123.456.789-09')).toBe(true);
      expect(isValidCPF('12345678909')).toBe(true);
    });

    it('should reject CPF with all equal digits', () => {
      expect(isValidCPF('111.111.111-11')).toBe(false);
      expect(isValidCPF('11111111111')).toBe(false);
      expect(isValidCPF('000.000.000-00')).toBe(false);
    });

    it('should reject CPF with less than 11 digits', () => {
      expect(isValidCPF('123.456.789')).toBe(false);
      expect(isValidCPF('12345678')).toBe(false);
      expect(isValidCPF('')).toBe(false);
    });

    it('should reject CPF with invalid check digits', () => {
      expect(isValidCPF('123.456.789-00')).toBe(false);
      expect(isValidCPF('123.456.789-99')).toBe(false);
    });

    it('should handle CPF with more than 11 digits', () => {
      expect(isValidCPF('123.456.789-091234')).toBe(false);
    });
  });

  describe('formatCPF', () => {
    it('should format CPF progressively as user types', () => {
      expect(formatCPF('123')).toBe('123');
      expect(formatCPF('1234')).toBe('123.4');
      expect(formatCPF('123456')).toBe('123.456');
      expect(formatCPF('1234567')).toBe('123.456.7');
      expect(formatCPF('123456789')).toBe('123.456.789');
      expect(formatCPF('12345678909')).toBe('123.456.789-09');
    });

    it('should maintain format if already formatted', () => {
      expect(formatCPF('123.456.789-09')).toBe('123.456.789-09');
    });

    it('should not format beyond 14 characters (formatted CPF length)', () => {
      const input = '123.456.789-09extra';
      expect(formatCPF(input)).toBe(input);
    });

    it('should remove non-numeric characters before formatting', () => {
      expect(formatCPF('123abc456def78909')).toBe('123.456.789-09');
    });

    it('should handle empty string', () => {
      expect(formatCPF('')).toBe('');
    });
  });
});
