import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'tests/unit/*.js', 'tests/unit/*.map', 'eslint.config.mjs'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Type-lookup is per file group — projectService and project must never
  // appear in the same block.
  {
    // src/ is covered by the primary tsconfig.json.
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    // Root-level config files live outside any tsconfig — give them a
    // default project without type-lookup pain.
    files: ['*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['*.ts'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // tests/ is not referenced by the primary tsconfig.json — type-check
    // them against the dedicated test project instead.
    files: ['tests/**/*.ts'],
    languageOptions: {
      parserOptions: { project: 'tsconfig.test.json', tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      'no-console': 'warn',
      'no-debugger': 'warn',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
      'no-duplicate-imports': 'error',
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      'no-process-exit': 'error',
      'no-return-await': 'error',
    },
  },
  {
    // Tests are not referenced by the primary tsconfig.json — type-check
    // them against the dedicated test project instead.
    files: ['tests/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: 'tsconfig.test.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Entry points legitimately exit the process on fatal conditions.
    files: ['src/index.ts', 'src/db/migrate.ts', 'src/workers/**/*.ts'],
    rules: {
      'no-process-exit': 'off',
    },
  },
  {
    // The standard way to type-augment Express's Request is declare-global +
    // namespace — the module-namespace rule must not fight that.
    files: ['src/middleware/auth.ts'],
    rules: {
      '@typescript-eslint/no-namespace': 'off',
    },
  }
);
