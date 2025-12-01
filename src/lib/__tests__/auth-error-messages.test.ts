import { describe, it, expect } from 'vitest';
import { getAuthErrorMessage } from '../auth-error-messages';

describe('auth-error-messages', () => {
  describe('getAuthErrorMessage', () => {
    it('should return friendly message for invalid credentials', () => {
      const error1 = { message: 'Invalid login credentials' };
      const error2 = { message: 'Invalid email or password' };

      expect(getAuthErrorMessage(error1)).toBe(
        'Email ou senha incorretos. Verifique seus dados e tente novamente.'
      );
      expect(getAuthErrorMessage(error2)).toBe(
        'Email ou senha incorretos. Verifique seus dados e tente novamente.'
      );
    });

    it('should return friendly message for weak password', () => {
      const error1 = { message: 'Password is too weak' };
      const error2 = { message: 'Password should be at least 8 characters' };

      expect(getAuthErrorMessage(error1)).toBe(
        'A senha precisa ter no mínimo 6 caracteres e ser mais forte. Tente usar letras maiúsculas, números e caracteres especiais.'
      );
      expect(getAuthErrorMessage(error2)).toBe(
        'A senha precisa ter no mínimo 6 caracteres e ser mais forte. Tente usar letras maiúsculas, números e caracteres especiais.'
      );
    });

    it('should return friendly message for email already registered', () => {
      const error1 = { message: 'User already registered' };
      const error2 = { message: 'Email already exists' };

      expect(getAuthErrorMessage(error1)).toBe(
        'Este email já está cadastrado. Tente fazer login ou use a opção "Esqueci minha senha".'
      );
      expect(getAuthErrorMessage(error2)).toBe(
        'Este email já está cadastrado. Tente fazer login ou use a opção "Esqueci minha senha".'
      );
    });

    it('should return friendly message for rate limit exceeded', () => {
      const error1 = { message: 'Email rate limit exceeded' };
      const error2 = { message: 'Too many requests' };

      expect(getAuthErrorMessage(error1)).toBe(
        'Muitas tentativas seguidas. Por favor, aguarde alguns minutos antes de tentar novamente.'
      );
      expect(getAuthErrorMessage(error2)).toBe(
        'Muitas tentativas seguidas. Por favor, aguarde alguns minutos antes de tentar novamente.'
      );
    });

    it('should return generic error message for unknown errors', () => {
      const error1 = { message: 'Some random error' };
      const error2 = {};
      const error3 = null;

      expect(getAuthErrorMessage(error1)).toBe(
        'Ocorreu um erro. Por favor, tente novamente em alguns instantes.'
      );
      expect(getAuthErrorMessage(error2)).toBe(
        'Ocorreu um erro. Por favor, tente novamente em alguns instantes.'
      );
      expect(getAuthErrorMessage(error3)).toBe(
        'Ocorreu um erro. Por favor, tente novamente em alguns instantes.'
      );
    });
  });
});
