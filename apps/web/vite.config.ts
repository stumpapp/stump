import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import tsconfigPaths from 'vite-plugin-tsconfig-paths'
import type { PluginOption } from 'vite'

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
		react({
			babel: {
				plugins: [['babel-plugin-react-compiler', {}]],
			},
		}),
		tsconfigPaths(),
		VitePWA({
			registerType: 'autoUpdate',
			devOptions: {
				enabled: false,
			},
			workbox: {
				maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
			},
			outDir: '../dist/assets/',
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
		reactFallbackThrottlePlugin(), // Leave empty for 0, or provide your own value if you like
	],
	publicDir: '../../../packages/browser/public',
	root: 'src',
	server: {
		port: 3000,
	},
})

// FIXME: This is actually fucking silly. I can't believe they hardcoded a 300ms throttle
// in React's source code with no way to override it. This plugin should be short term, I loved
// the DX of suspense but fuck if I'm dealing with this. Move off of it, I guess.
function reactFallbackThrottlePlugin(throttleMs = 0): {
	name: string
	transform: {
		filter: { id: { include: string[] } }
		handler: (src: string, id: string) => { code: string; map: null }
	}
} {
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
	} satisfies PluginOption
}
