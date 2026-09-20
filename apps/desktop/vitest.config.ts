import tsconfigPaths from 'vite-plugin-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		environment: 'jsdom',
		globals: true,
		exclude: ['**/node_modules/**', '**/dist/**'],
	},
})
