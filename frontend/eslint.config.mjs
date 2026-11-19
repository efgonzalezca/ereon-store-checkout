import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', '*.cjs', '*.mjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  eslintConfigPrettier,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.jest } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
