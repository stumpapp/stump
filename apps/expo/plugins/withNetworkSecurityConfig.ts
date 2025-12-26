import { AndroidConfig, withAndroidManifest, withDangerousMod } from '@expo/config-plugins'
import { type ExpoConfig } from 'expo/config'
import * as fs from 'fs'
import * as path from 'path'

const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>
`

/**
 * Creates the network_security_config.xml file in android/app/src/main/res/xml/
 */
function withNetworkSecurityConfigFile(config: ExpoConfig) {
	return withDangerousMod(config, [
		'android',
		async (config) => {
			const resPath = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res')
			const xmlPath = path.join(resPath, 'xml')

			if (!fs.existsSync(xmlPath)) {
				fs.mkdirSync(xmlPath, { recursive: true })
			}

			const configFilePath = path.join(xmlPath, 'network_security_config.xml')
			fs.writeFileSync(configFilePath, NETWORK_SECURITY_CONFIG_XML)

			return config
		},
	])
}

/**
 * Adds android:networkSecurityConfig="@xml/network_security_config" to the <application> tag
 */
function withNetworkSecurityConfigManifest(config: ExpoConfig) {
	return withAndroidManifest(config, async (config) => {
		const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults)

		mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config'

		return config
	})
}

/**
 * An Android plugin that:
 * 1. Creates the network_security_config.xml file
 * 2. References it in AndroidManifest.xml
 *
 * This allows user-installed certificates to be trusted by the app.
 * See https://github.com/expo/expo/issues/7200
 */
export default function withNetworkSecurityConfig(config: ExpoConfig) {
	config = withNetworkSecurityConfigFile(config)
	config = withNetworkSecurityConfigManifest(config)
	return config
}
