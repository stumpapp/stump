import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vitest/config'

// TODO: lots of warnings running vitetest, i just need to upgrade vite but
// def not doing that right now

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: ['./vitest.setup.ts'],
		exclude: ['**/node_modules/**', '**/dist/**'],
		server: {
			deps: {
				inline: [
					'@stump/client',
					'@stump/sdk',
					'@stump/components',
					'@stump/i18n',
					'@stump/graphql',
				],
			},
		},
	},
})
