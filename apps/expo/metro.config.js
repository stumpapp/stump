const { getDefaultConfig } = require('@expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config')
const path = require('path')

// Find the project and workspace directories
const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot]
// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, 'node_modules'),
	path.resolve(workspaceRoot, 'node_modules'),
]
// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
// TODO: Needs fix - Although not ideal, this must be set to `false` in order to avoid a dependency collision on uuid
config.resolver.disableHierarchicalLookup = false

config.resolver.sourceExts.push('sql') // https://orm.drizzle.team/docs/connect-expo-sqlite

module.exports = wrapWithReanimatedMetroConfig(
	withNativeWind(config, { input: './global.css', projectRoot }),
)
