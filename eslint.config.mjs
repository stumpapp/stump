import pluginJs from '@eslint/js'
import prettierPlugin from 'eslint-plugin-prettier/recommended'
import pluginReact from 'eslint-plugin-react'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
	{
		ignores: ['**/dist/*', '**/target/**'],
	},
	{
		files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
		plugins: {
			'simple-import-sort': simpleImportSort,
		},
		rules: {
			'no-console': 'error',
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
]
