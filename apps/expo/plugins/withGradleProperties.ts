import { ConfigPlugin, withGradleProperties } from 'expo/config-plugins'

const withCustomGradleProperties: ConfigPlugin = (config) => {
	return withGradleProperties(config, (config) => {
		config.modResults = config.modResults.filter(
			(item) => !(item.type === 'property' && item.key === 'org.gradle.jvmargs'),
		)

		// i often find myself needing to adjust the heap size when doing dev builds manually after
		// prebuilds, but this should be a good default and make it persistent
		config.modResults.push({
			type: 'property',
			key: 'org.gradle.jvmargs',
			value: '-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError',
		})

		return config
	})
}

export default withCustomGradleProperties
