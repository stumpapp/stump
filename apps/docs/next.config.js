// @ts-expect-error: idk y though
const withNextra = require('nextra')({
	theme: 'nextra-theme-docs',
	themeConfig: './theme.config.tsx',
})

module.exports = withNextra()
