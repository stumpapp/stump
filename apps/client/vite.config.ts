import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import loadVersion from 'vite-plugin-package-version';
import * as path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), loadVersion()],
	base: '/',
	build: {
		outDir: 'build',
		manifest: true,
	},
	server: {
		port: 3000,
	},
	resolve: {
		alias: {
			'~': path.resolve('./src'),
			'~components': path.resolve('./src/components'),
			'~ui': path.resolve('./src/ui'),
			'~pages': path.resolve('./src/pages'),
			'~api': path.resolve('./src/api'),
			'~stores': path.resolve('./src/stores'),
			'~util': path.resolve('./src/util'),
			'~hooks': path.resolve('./src/hooks'),
			'~i18n': path.resolve('./src/i18n'),
		},
	},
});
