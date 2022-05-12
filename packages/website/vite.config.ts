import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pages from 'vite-plugin-pages';
import * as path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
	// @ts-ignore
	plugins: [
		react(),

		pages({
			dirs: 'src/pages',
		}),
	],
	publicDir: 'public',
	resolve: {
		alias: {
			'~': path.resolve('./src'),
			'~components': path.resolve('./src/components'),
			'~hooks': path.resolve('./src/hooks'),
			'~pages': path.resolve('./src/pages'),
		},
	},
});
