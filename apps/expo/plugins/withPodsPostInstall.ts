import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { withDangerousMod } from '@expo/config-plugins'
import { type ExpoConfig } from 'expo/config'

//! This is maybe the worlds most yucky fix for an issue with CocoaPods. The root problem is
//! that both ZIPFoundation and ReadiumZIPFoundation try to create a bundle with the same name,
//! which for whatever reason works fine for dev builds but falls hard on production builds.
//! So to circumvent this, we are directly modifying the Podfile to remove the ZIPFoundation_Privacy.bundle
//! from the "Embed Pods Frameworks" phase entirely.

export default function withPodsPostInstall(config: ExpoConfig) {
	return withDangerousMod(config, [
		'ios',
		async (config) => {
			const filePath = join(config.modRequest.platformProjectRoot, 'Podfile')
			let contents = await readFile(filePath, 'utf-8')

			if (!contents.includes('Fix duplicate ZIPFoundation_Privacy.bundle')) {
				const postInstallRegex = /(post_install do \|installer\|)/

				const fixCode = `$1
    # Fix duplicate ZIPFoundation_Privacy.bundle
    # Both ZIPFoundation and ReadiumZIPFoundation create this bundle, causing conflicts
    
    # Delete the duplicate target
    installer.pods_project.targets.delete_if { |target| target.name == 'ZIPFoundation-ZIPFoundation_Privacy' }
    
    # Update script to not copy the deleted bundle
    frameworks_script_path = File.join(installer.sandbox.root, 'Target Support Files/Pods-Stump/Pods-Stump-frameworks.sh')
    if File.exist?(frameworks_script_path)
      frameworks_script = File.read(frameworks_script_path)
      frameworks_script.gsub!(/.*ZIPFoundation\\/ZIPFoundation_Privacy\\.bundle.*\\n/, '')
      File.write(frameworks_script_path, frameworks_script)
    end
    
    # Update script to not copy the deleted bundle  
    resources_script_path = File.join(installer.sandbox.root, 'Target Support Files/Pods-Stump/Pods-Stump-resources.sh')
    if File.exist?(resources_script_path)
      resources_script = File.read(resources_script_path)
      resources_script.gsub!(/.*ZIPFoundation_Privacy\\.bundle.*\\n/, '')
      File.write(resources_script_path, resources_script)
    end
    `

				contents = contents.replace(postInstallRegex, fixCode)
				await writeFile(filePath, contents)
			}

			return config
		},
	])
}
