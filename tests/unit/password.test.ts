import { hashPassword, verifyPassword } from '../../src/lib/password';

describe('Password Utils', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hash = await hashPassword('testpassword123');
      expect(hash).toBeDefined();
      expect(hash).not.toBe('testpassword123');
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('should produce different hashes for same password', async () => {
      const hash1 = await hashPassword('testpassword123');
      const hash2 = await hashPassword('testpassword123');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const hash = await hashPassword('testpassword123');
      const valid = await verifyPassword('testpassword123', hash);
      expect(valid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const hash = await hashPassword('testpassword123');
      const valid = await verifyPassword('wrongpassword', hash);
      expect(valid).toBe(false);
    });
  });
});
