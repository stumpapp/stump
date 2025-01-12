import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-plugin-tsconfig-paths'

// https://www.npmjs.com/package/vite-plugin-node-polyfills
import { name, version } from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		assetsDir: './assets',
		manifest: true,
		outDir: '../dist',
	},
	clearScreen: false,
	define: {
		pkgJson: { name, version },
	},
	plugins: [react(), tsconfigPaths()],
	publicDir: '../../../packages/browser/public',
	root: 'src',
	server: {
		port: 3000,
	},
	// FIXME: This can't be fixed like this, it would have to be dynamic... But this is build-time..
	base: '/web/',
})
