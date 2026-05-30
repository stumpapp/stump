import { constants as zlibConstants } from 'node:zlib'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin, PluginOption } from 'vite'
import { defineConfig } from 'vite'
import { compression, defineAlgorithm } from 'vite-plugin-compression2'
import { VitePWA } from 'vite-plugin-pwa'
import tsconfigPaths from 'vite-plugin-tsconfig-paths'

// https://www.npmjs.com/package/vite-plugin-node-polyfills
import { LOCALES } from '../../packages/i18n/src/locales'
import { name, version } from './package.json'

const localeGlobIgnores = LOCALES.filter((locale) => locale !== 'en-US').map(
	(locale) => `**/assets/${locale}-*.js`,
)

// https://vitejs.dev/config/
const plugins = [
	tailwindcss(),
	react({
		babel: {
			plugins: [['babel-plugin-react-compiler', {}]],
		},
	}),
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
			maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
			globIgnores: [...localeGlobIgnores, '**/*.woff2', '**/*.woff'],
			runtimeCaching: [
				{
					urlPattern: ({ request }) => request.destination === 'font',
					handler: 'CacheFirst',
					options: {
						cacheName: 'stump-fonts',
						expiration: {
							maxEntries: 100,
							maxAgeSeconds: 60 * 60 * 24 * 365,
						},
						cacheableResponse: {
							statuses: [0, 200],
						},
					},
				},
				{
					urlPattern: ({ request }) => request.destination === 'image',
					handler: 'StaleWhileRevalidate',
					options: {
						cacheName: 'stump-images',
						expiration: {
							maxEntries: 500,
							maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
						},
						cacheableResponse: {
							statuses: [0, 200],
						},
					},
				},
			],
		},
		outDir: '../dist',
		base: '/',
		// Note(pwa): Additional manifest definitions can improve install UX.
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
	reactFallbackThrottlePlugin(), // Use 0 to disable fallback throttle entirely.
] as unknown as PluginOption[] // Vite's PluginOption type is a deep union; this cast keeps plugin inference practical.

export default defineConfig({
	build: {
		emptyOutDir: true,
		assetsDir: './assets',
		chunkSizeWarningLimit: 600,
		manifest: true,
		modulePreload: {
			polyfill: true,
		},
		outDir: '../dist',
	},
	clearScreen: false,
	define: {
		pkgJson: { name, version },
	},
	plugins,
	publicDir: '../../../packages/browser/public',
	root: 'src',
	server: {
		port: 3000,
	},
})

// Note: React hardcodes fallback throttle behavior. This plugin keeps it configurable
// until upstream behavior can be replaced with a cleaner long-term approach.
function reactFallbackThrottlePlugin(throttleMs = 0): Plugin {
	return {
		name: 'vite-plugin-react-fallback-throttle',
		transform: {
			filter: {
				id: {
					include: [
						'**/react-dom-client.development.js',
						'**/react-dom-profiling.development.js',
						'**/react-dom-client.production.js',
						'**/react-dom*.js{?*,}',
						'**/react-dom*',
					],
				},
			},
			handler(src) {
				const srcWithReplacedFallbackThrottle = src
					// development
					.replace('FALLBACK_THROTTLE_MS = 300,', `FALLBACK_THROTTLE_MS = ${throttleMs},`)
					// production
					.replace(
						'((exitStatus = globalMostRecentFallbackTime + 300 - now())',
						`((exitStatus = globalMostRecentFallbackTime + ${throttleMs} - now())`,
					)
					.replace(
						'300 > now() - globalMostRecentFallbackTime)',
						`${throttleMs} > now() - globalMostRecentFallbackTime)`,
					)
					.replace(
						'(renderWasConcurrent = globalMostRecentFallbackTime + 300 - now())',
						`(renderWasConcurrent = globalMostRecentFallbackTime + ${throttleMs} - now())`,
					)

				const result = {
					code: srcWithReplacedFallbackThrottle,
					map: null,
				}

				return result
			},
		},
	}
}
