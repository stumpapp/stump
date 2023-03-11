const path = require('path')

module.exports = {
	pluginSearchDirs: [path.resolve(__dirname)],
	plugins: [require('prettier-plugin-tailwindcss')],
	// plugins: Object.keys(require('./package.json').devDependencies)
	// 	.filter((dep) => dep.includes('prettier-plugin-'))
	// 	.map((pkg) => require(pkg)),
	printWidth: 100,
	semi: false,
	singleQuote: true,
	tabWidth: 2,
	tailwindConfig: path.resolve(__dirname, 'packages/components', 'tailwind.config.js'),
	trailingComma: 'all',
	useTabs: true,
}
