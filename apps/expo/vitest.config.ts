import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['**/__tests__/**/*.test.{ts,tsx}'],
		exclude: ['node_modules', '.expo', 'ios', 'android'],
	},
	resolve: {
		alias: {
			'~': path.resolve(__dirname, './'),
			'@stump/sdk': path.resolve(__dirname, '../../packages/sdk/src/index.ts'),
			'@stump/client': path.resolve(__dirname, '../../packages/client/src/index.ts'),
			'@stump/graphql': path.resolve(__dirname, '../../packages/graphql/src/index.ts'),
		},
	},
})
