import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    rules: {
      // React 19's set-state-in-effect rule flags intentional async data-loading effects.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['src/context/AuthContext.jsx', 'src/context/ClientAuthContext.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
