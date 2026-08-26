import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-plugin-tsconfig-paths'

import { name, version } from './package.json'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

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
	plugins: [tailwindcss(), react(), babel({ presets: [reactCompilerPreset()] }), tsconfigPaths()],
	publicDir: '../../../packages/browser/public',
	root: 'src',
	server: {
		port: 3000,
	},
})
