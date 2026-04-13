import {
  migrations,
  organisations,
  users,
  apiKeys,
  files,
  usageLogs,
  usageDaily,
} from '../../src/db/schema';

describe('Drizzle Schema Exports', () => {
  it('should export migrations table', () => {
    expect(migrations).toBeDefined();
  });

  it('should export organisations table', () => {
    expect(organisations).toBeDefined();
  });

  it('should export users table', () => {
    expect(users).toBeDefined();
  });

  it('should export apiKeys table', () => {
    expect(apiKeys).toBeDefined();
  });

  it('should export files table', () => {
    expect(files).toBeDefined();
  });

  it('should export usageLogs table', () => {
    expect(usageLogs).toBeDefined();
  });

  it('should export usageDaily table', () => {
    expect(usageDaily).toBeDefined();
  });

  it('should have id column on all tables', () => {
    expect(organisations.id).toBeDefined();
    expect(users.id).toBeDefined();
    expect(apiKeys.id).toBeDefined();
    expect(files.id).toBeDefined();
    expect(usageLogs.id).toBeDefined();
    expect(usageDaily.id).toBeDefined();
  });

  it('should have createdAt column on tables with timestamps', () => {
    expect(organisations.createdAt).toBeDefined();
    expect(users.createdAt).toBeDefined();
    expect(apiKeys.createdAt).toBeDefined();
    expect(files.createdAt).toBeDefined();
    expect(usageLogs.createdAt).toBeDefined();
  });
});
