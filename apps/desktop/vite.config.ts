import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-plugin-tsconfig-paths';

import { name, version } from './package.json';

// TODO: move this to common/config?
// https://vitejs.dev/config/
export default defineConfig({
	base: '/',
	build: {
		assetsDir: './assets',
		manifest: true,
		outDir: '../dist',
	},
	define: {
		pkgJson: { name, version },
	},
	plugins: [react(), tsconfigPaths()],
	publicDir: '../../../packages/interface/public',
	root: 'src',
	server: {
		port: 3000,
	},
});
