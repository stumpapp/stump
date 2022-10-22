const brand = {
	DEFAULT: '#C48259',
	50: '#F4E8E0',
	100: '#EFDDD1',
	200: '#E4C6B3',
	300: '#D9AF95',
	400: '#CF9977',
	500: '#C48259',
	600: '#A9663C',
	700: '#7F4D2D',
	800: '#56341F',
	900: '#2D1B10',
};

/**
 *
 * @param {string} app The name of the app
 * @returns tailwind config object
 */
module.exports = function (app) {
	let config = {
		darkMode: 'class',
		// content: ['./**/*.{js,ts,jsx,tsx}', './index.html'],
		content: [
			'../../common/*/src/**/*.{js,ts,jsx,tsx,html}',
			app ? `../../apps/${app}/src/**/*.{js,ts,jsx,tsx,html}` : `./src/**/*.{js,ts,jsx,tsx,html}`,
		],
		theme: {
			extend: {
				colors: {
					gray: {
						50: '#F7FAFC',
						65: '#F3F7FA',
						75: '#F1F5F9',
						100: '#EDF2F7',
						150: '#E8EDF4',
						200: '#E2E8F0',
						250: '#D8DFE9',
						300: '#CBD5E0',
						350: '#B7C3D1',
						400: '#A0AEC0',
						450: '#8B99AD',
						500: '#718096',
						550: '#5F6C81',
						600: '#4A5568',
						650: '#3D4759',
						700: '#2D3748',
						750: '#212836',
						800: '#1A202C',
						850: '#191D28',
						900: '#171923',
						950: '#11121A',
						1000: '#0B0C11',
						1050: '#050507',
						1100: '#010101',
					},
					brand,
				},
				ringColor: {
					DEFAULT: brand['500'],
				},
				screens: {
					'3xl': '1600px',
				},
			},
		},
		variants: {
			extend: {
				backgroundImage: ['dark'],
			},
		},
		plugins: [require('tailwind-scrollbar-hide'), require('@tailwindcss/typography')],
	};

	return config;
};
