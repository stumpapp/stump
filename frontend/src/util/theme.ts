// theme.js

// 1. import `extendTheme` function
import { extendTheme } from '@chakra-ui/react';

// 2. Add your color mode config
const config = {
	initialColorMode: 'dark',
	useSystemColorMode: false,
};

const colors = {
	brand: {
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
	},
};

// 3. extend the theme
const theme = extendTheme({ config, colors });

export default theme;
