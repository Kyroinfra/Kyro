"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("../../src/lib/auth");
describe('Auth Utils', () => {
    const testPayload = {
        userId: 'user-123',
        orgId: 'org-456',
        role: 'owner',
    };
    describe('signJWT', () => {
        it('should sign a JWT', () => {
            const token = (0, auth_1.signJWT)(testPayload);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });
    });
    describe('verifyJWT', () => {
        it('should verify a valid JWT', () => {
            const token = (0, auth_1.signJWT)(testPayload);
            const payload = (0, auth_1.verifyJWT)(token);
            expect(payload.userId).toBe(testPayload.userId);
            expect(payload.orgId).toBe(testPayload.orgId);
            expect(payload.role).toBe(testPayload.role);
        });
        it('should throw on invalid token', () => {
            expect(() => (0, auth_1.verifyJWT)('invalid.token.here')).toThrow();
        });
        it('should throw on tampered token', () => {
            const token = (0, auth_1.signJWT)(testPayload);
            const tampered = token.slice(0, -5) + 'xxxxx';
            expect(() => (0, auth_1.verifyJWT)(tampered)).toThrow();
        });
    });
});
//# sourceMappingURL=auth.test.js.map