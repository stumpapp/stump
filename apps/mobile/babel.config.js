module.exports = function (api) {
	api.cache(true)
	return {
		plugins: [
			'@babel/plugin-proposal-export-namespace-from',
			'react-native-reanimated/plugin',
			'nativewind/babel',
		],
		presets: ['babel-preset-expo'],
	}
}
