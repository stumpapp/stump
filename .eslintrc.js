// TODO: Update this config... https://typescript-eslint.io/blog/announcing-typescript-eslint-v6/
// TODO: Please I already forgot :sob:
module.exports = {
	env: {
		browser: true,
		node: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:react/recommended',
		'plugin:react-hooks/recommended',
		'prettier',
	],
	overrides: [
		{
			files: ['*.jsx', '*.tsx', '*.ts'],
			rules: {
				'@typescript-eslint/no-non-null-assertion': 'off',
				'no-console': ['error', { allow: ['warn', 'error', 'debug'] }],
				'react/react-in-jsx-scope': 'off',
			},
		},
		{
			files: ['*.config.js', '.eslintrc.js'],
			rules: {
				'@typescript-eslint/no-var-requires': 'off',
				'import/no-commonjs': 'off',
				'sort-keys': 'off',
				'unicorn/prefer-module': 'off',
			},
		},
		{
			files: ['**/__tests__/**/*', '*.test.ts', '*.test.tsx'],
			rules: {
				'@typescript-eslint/no-explicit-any': 'off',
			},
		},
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaFeatures: {
			jsx: true,
		},
		project: 'tsconfig.eslint.json',
		tsconfigRootDir: __dirname,
	},
	plugins: ['@typescript-eslint', 'simple-import-sort', 'prettier', 'sort-keys-fix', 'react'],
	root: true,
	rules: {
		'import/no-unresolved': 'off',
		'import/no-useless-path-segments': 'off',
		'no-console': 'error',
		'simple-import-sort/exports': 'error',
		'simple-import-sort/imports': 'error',
		'sort-keys-fix/sort-keys-fix': 'warn',
	},
	settings: {
		react: {
			version: 'detect',
		},
	},
}
