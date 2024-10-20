import pluginJs from '@eslint/js'
import prettierPlugin from 'eslint-plugin-prettier/recommended'
import pluginReact from 'eslint-plugin-react'
import pluginReactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import keySort from 'eslint-plugin-sort-keys-fix'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
	{
		ignores: ['**/dist/*', '**/target/**', '**/.next/**', '**/.vercel/**'],
	},
	{
		files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
		plugins: {
			'simple-import-sort': simpleImportSort,
			react: pluginReact,
			'react-hooks': pluginReactHooks,
			'sort-keys-fix': keySort,
		},
		settings: {
			react: {
				version: 'detect',
			},
		},
		rules: {
			'no-console': ['error', { allow: ['warn', 'error'] }],
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',
			'sort-imports': 'off',
			semi: 0,
			'prettier/prettier': [
				'error',
				{
					semi: false,
				},
			],
		},
	},
	{ languageOptions: { globals: globals.node } },
	{ languageOptions: { globals: globals.browser } },
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	prettierPlugin,
	pluginReact.configs.flat.recommended,
	pluginReact.configs.flat['jsx-runtime'],
	{
		files: ['**/*.test.{ts,tsx}', '**/__tests__/**'],
		languageOptions: { globals: globals.jest },
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},
	{
		files: ['**/*.config.js'],
		rules: {
			'@typescript-eslint/no-require-imports': 'off',
		},
	},
]
