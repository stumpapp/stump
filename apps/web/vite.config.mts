import { constants as zlibConstants } from 'node:zlib'

import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { compression, defineAlgorithm } from 'vite-plugin-compression2'
import { VitePWA } from 'vite-plugin-pwa'
import reactFallbackThrottlePlugin from 'vite-plugin-react-fallback-throttle'
import tsconfigPaths from 'vite-plugin-tsconfig-paths'

// https://www.npmjs.com/package/vite-plugin-node-polyfills
import { name, version } from './package.json'

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		assetsDir: './assets',
		manifest: true,
		outDir: '../dist',
		emptyOutDir: true,
		rollupOptions: {
			output: {
				manualChunks(id) {
					const path = id.replaceAll('\\', '/')
					if (!path.includes('/node_modules/')) {
						return
					}

					if (path.includes('/node_modules/lucide-react/')) {
						return 'vendor-lucide'
					}
					if (path.includes('/node_modules/@tanstack/')) {
						return 'vendor-tanstack'
					}
					if (path.includes('/node_modules/lodash/')) {
						return 'vendor-lodash'
					}
					if (path.includes('/node_modules/framer-motion/')) {
						return 'vendor-framer'
					}
					if (path.includes('/node_modules/overlayscrollbars/')) {
						return 'vendor-overlayscrollbars'
					}
					if (
						path.includes('/node_modules/react/') ||
						path.includes('/node_modules/react-dom/') ||
						path.includes('/node_modules/scheduler/')
					) {
						return 'vendor-react'
					}
				},
			},
		},
	},
	clearScreen: false,
	define: {
		pkgJson: { name, version },
	},
	plugins: [
		tailwindcss(),
		react(),
		babel({ presets: [reactCompilerPreset()] }),
		tsconfigPaths(),
		compression({
			include: [/\.(js|mjs|json|css|html|svg|xml|wasm)$/i],
			exclude: [/\.(png|jpe?g|gif|webp|avif|woff2?|mp4|webm)$/i],
			threshold: 1024,
			algorithms: [
				defineAlgorithm('gzip', { level: 9 }),
				defineAlgorithm('brotliCompress', {
					params: {
						[zlibConstants.BROTLI_PARAM_QUALITY]: 11,
					},
				}),
			],
		}),
		VitePWA({
			// We manually register in src/index.tsx to add idle scheduling and script preflight checks.
			injectRegister: null,
			registerType: 'autoUpdate',
			devOptions: {
				enabled: false,
			},
			workbox: {
				inlineWorkboxRuntime: true,
				navigateFallbackDenylist: [
					/^\/api(?:\/|$)/,
					/^\/opds(?:\/|$)/,
					/^\/kobo(?:\/|$)/,
					/^\/koreader(?:\/|$)/,
				],
				maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // 6MB
			},
			outDir: '../dist',
			base: '/',
			// TODO(pwa): Add more manifest definitions for better overall experience
			manifest: {
				id: 'stump',
				name: 'Stump PWA',
				short_name: 'Stump',
				theme_color: '#161719',
				icons: [
					{
						src: '/assets/favicon-16x16.png',
						sizes: '16x16',
						type: 'image/png',
					},
					{
						src: '/assets/favicon-192x192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: '/assets/favicon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable',
					},
				],
			},
			manifestFilename: 'assets/manifest.webmanifest',
		}),
		reactFallbackThrottlePlugin(),
	],
	publicDir: '../../../packages/browser/public',
	root: 'src',
	server: {
		port: 3000,
	},
})
