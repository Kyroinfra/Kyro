import { registerSchema, loginSchema, inviteSchema } from '../../src/validations/auth';

describe('Auth Validations', () => {
  describe('registerSchema', () => {
    it('should validate correct input', () => {
      const result = registerSchema.safeParse({
        orgName: 'My Company',
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = registerSchema.safeParse({
        orgName: 'My Company',
        email: 'not-an-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const result = registerSchema.safeParse({
        orgName: 'My Company',
        email: 'test@example.com',
        password: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing org name', () => {
      const result = registerSchema.safeParse({
        orgName: '',
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate correct input', () => {
      const result = loginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing email', () => {
      const result = loginSchema.safeParse({
        email: '',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('inviteSchema', () => {
    it('should validate correct input with default role', () => {
      const result = inviteSchema.safeParse({
        email: 'newuser@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('member');
      }
    });

    it('should validate explicit role', () => {
      const result = inviteSchema.safeParse({
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('admin');
      }
    });

    it('should reject invalid role', () => {
      const result = inviteSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
        role: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });
});
