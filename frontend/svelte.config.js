import adapter from '@sveltejs/adapter-static';
import preprocess from 'svelte-preprocess';
import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: [preprocess({})],

	kit: {
		adapter: adapter(),

		// hydrate the <div id="svelte"> element in src/app.html
		// target: '#svelte',
		vite: {
			resolve: {
				// FIXME: NOT WORKING >:(
				alias: {
					'@': path.resolve('./src'),
					'@lib': path.resolve('./src/lib'),
					'@components': path.resolve('./src/lib/components'),
					// '@util': path.resolve('./src/lib/util'),
					'@api': path.resolve('./src/lib/api'),
					'@store': path.resolve('./src/store')
				}
			}
		}
	},
	// https://giters.com/sveltejs/kit/issues/2253 => the svelte headlessui
	// package I have absolutely spams my terminal with warnings so I'm disabling
	// it for the entire node_modules folder
	onwarn: (warning, handler) => {
		if (warning.filename.includes('node_modules')) return;

		handler(warning);
	}
};

export default config;
