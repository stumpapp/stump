module.exports = function (api) {
	api.cache(true)
	return {
		presets: [
			['babel-preset-expo', { jsxImportSource: 'nativewind', unstable_transformImportMeta: true }],
			'nativewind/babel',
		],
		plugins: [
			['babel-plugin-react-compiler', {}],
			'react-native-reanimated/plugin',
			['inline-import', { extensions: ['.sql'] }],
		],
	}
}
