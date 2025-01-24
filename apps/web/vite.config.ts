import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
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
	plugins: [
		react(),
		tsconfigPaths(),
		VitePWA({
			registerType: 'autoUpdate',
			devOptions: {
				enabled: true,
			},
			workbox: {
				maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
			},
			outDir: '../dist/assets/',
		}),
	],
	publicDir: '../../../packages/browser/public',
	root: 'src',
	server: {
		port: 3000,
	},
})
