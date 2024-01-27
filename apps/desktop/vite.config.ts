import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-plugin-tsconfig-paths'

import { name, version } from './package.json'

// TODO: move this to common/config?
// https://vitejs.dev/config/
export default defineConfig({
	base: '/',
	build: {
		assetsDir: './assets',
		manifest: true,
		outDir: '../dist',
		rollupOptions: {
			input: {
				main: resolve(__dirname, 'src', 'index.html'),
				splash: resolve(__dirname, 'src', 'splash-screen.html'),
			},
		},
	},
	define: {
		pkgJson: { name, version },
	},
	plugins: [react(), tsconfigPaths()],
	publicDir: '../../../interface/public',
	root: 'src',
	server: {
		port: 3000,
	},
})
