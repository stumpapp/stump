import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-plugin-tsconfig-paths';

import react from '@vitejs/plugin-react';

import { name, version } from './package.json';

// TODO: move this to common/config?
// https://vitejs.dev/config/
export default defineConfig({
	server: {
		port: 3000,
	},
	plugins: [react(), tsconfigPaths()],
	root: 'src',
	publicDir: '../../../common/interface/public',
	base: '/',
	define: {
		pkgJson: { name, version },
	},
	build: {
		outDir: '../dist',
		assetsDir: './assets',
		manifest: true,
	},
});
