import { signJWT, verifyJWT, JWTPayload } from '../../src/lib/auth';

describe('Auth Utils', () => {
  const testPayload: JWTPayload = {
    userId: 'user-123',
    orgId: 'org-456',
    role: 'owner',
  };

  describe('signJWT', () => {
    it('should sign a JWT', () => {
      const token = signJWT(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyJWT', () => {
    it('should verify a valid JWT', () => {
      const token = signJWT(testPayload);
      const payload = verifyJWT(token);
      expect(payload.userId).toBe(testPayload.userId);
      expect(payload.orgId).toBe(testPayload.orgId);
      expect(payload.role).toBe(testPayload.role);
    });

    it('should throw on invalid token', () => {
      expect(() => verifyJWT('invalid.token.here')).toThrow();
    });

    it('should throw on tampered token', () => {
      const token = signJWT(testPayload);
      const tampered = token.slice(0, -5) + 'xxxxx';
      expect(() => verifyJWT(tampered)).toThrow();
    });
  });
});
