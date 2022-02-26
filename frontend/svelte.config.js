import adapter from '@sveltejs/adapter-static';
import preprocess from 'svelte-preprocess';
import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: [preprocess({ postcss: true })],

	kit: {
		adapter: adapter(),

		// hydrate the <div id="svelte"> element in src/app.html
		// target: '#svelte',
		vite: {
			resolve: {
				alias: {
					'@': path.resolve('./src'),
					'@lib': path.resolve('./src/lib'),
					'@components': path.resolve('./src/lib/components'),
					'@api': path.resolve('./src/lib/api'),
					'@store': path.resolve('./src/store'),
				},
			},
			define: {
				__APP_VERSION__: JSON.stringify(process.env.npm_package_version),
			},
		},
	},
	// https://giters.com/sveltejs/kit/issues/2253 => the svelte headlessui
	// package I have absolutely spams my terminal with warnings so I'm disabling
	// it for the entire node_modules folder
	onwarn: (warning, handler) => {
		if (warning.filename.includes('node_modules')) return;

		handler(warning);
	},
};

export default config;
