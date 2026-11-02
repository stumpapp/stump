import pluginJs from '@eslint/js'
import { defineConfig } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'
import pluginReact from 'eslint-plugin-react'
import pluginReactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
	{
		ignores: [
			'**/dist/**',
			'**/dev-dist/**',
			'**/target/**',
			'**/.next/**',
			'**/.vercel/**',
			'**/.expo/**',
			'**/.source/**',
			'**/emoji/data.json',
			'apps/expo/android/**',
			'apps/expo/ios/**',
			'packages/graphql/src/client/**',
		],
	},
	pluginJs.configs.recommended,
	tseslint.configs.recommended,
	pluginReact.configs.flat.recommended,
	pluginReact.configs.flat['jsx-runtime'],
	pluginReactHooks.configs.flat['recommended-latest'],
	// ^ includes react-compiler
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		plugins: { 'simple-import-sort': simpleImportSort },
		settings: { react: { version: 'detect' } },
		rules: {
			'no-console': ['error', { allow: ['warn', 'error'] }],
			semi: 0,
			'sort-imports': 'off',
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',
			'react-hooks/set-state-in-effect': 'off',
		},
	},
	{
		files: ['**/*.test.{ts,tsx}', '**/__tests__/**', '**/__mocks__/**'],
		languageOptions: { globals: globals.vitest },
		rules: { '@typescript-eslint/no-explicit-any': 'off' },
	},
	{
		files: ['**/*.config.{js,cjs}', '**/babel.config.js', '**/metro.config.js'],
		rules: { '@typescript-eslint/no-require-imports': 'off' },
	},
	{
		files: ['scripts/**/*.{js,ts,mjs}'],
		rules: { '@typescript-eslint/no-require-imports': 'off', 'no-console': 'off' },
	},
	eslintConfigPrettier,
)
