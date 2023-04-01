/* eslint-disable @typescript-eslint/no-var-requires */

const plugin = require('tailwindcss/plugin')

const baseStyles = {
	'-webkit-box-orient': 'vertical',
	display: '-webkit-box',
	overflow: 'hidden',
}

const lineFluff = plugin(
	function ({ matchUtilities, addUtilities, theme }) {
		const values = theme('lineClamp')

	// 	matchUtilities(
	// 		{
	// 			'line-fluff': (value) => ({
	// 				...baseStyles,
  //         'after:content-[\'_↗\']'
	// 				'-webkit-line-clamp': `${value}`,
	// 			}),
	// 		},
	// 		{ values },
	// 	)

	// 	addUtilities([
	// 		{
	// 			'.line-clamp-none': {
	// 				'-webkit-line-clamp': 'unset',
	// 			},
	// 		},
	// 	])
	// },
	// {
	// 	theme: {
	// 		lineClamp: {
	// 			1: '1',
	// 			2: '2',
	// 			3: '3',
	// 			4: '4',
	// 			5: '5',
	// 			6: '6',
	// 		},
	// 	},
	// },
)
