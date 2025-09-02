import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins'
import * as fs from 'fs'
import * as path from 'path'

type DrawableAssetsPluginProps = {
	/**
	 * Source directory containing your drawable assets (relative to project root)
	 */
	sourceDir?: string
	/**
	 * Array of file extensions to copy
	 */
	extensions?: string[]
	/**
	 * Whether to create density-specific folders (hdpi, xhdpi, etc.)
	 */
	createDensityFolders?: boolean
}

// TODO: I've tinkered with this for hours and can't get it working right

const withDrawableAssets: ConfigPlugin<DrawableAssetsPluginProps> = (
	config,
	{
		sourceDir = 'assets/icons',
		extensions = ['.png', '.jpg', '.jpeg', '.svg', '.xml'],
		createDensityFolders = false,
	} = {},
) => {
	return withDangerousMod(config, [
		'android',
		async (config) => {
			const projectRoot = config.modRequest.projectRoot
			const sourceDirectory = path.resolve(projectRoot, sourceDir)
			const androidResPath = path.resolve(config.modRequest.platformProjectRoot, 'app/src/main/res')

			if (!fs.existsSync(sourceDirectory)) {
				console.warn(
					`⚠️ Source directory ${sourceDirectory} does not exist. Skipping drawable assets copy`,
				)
				return config
			}

			// Create drawable directories
			const drawableDir = path.join(androidResPath, 'drawable')
			if (!fs.existsSync(drawableDir)) {
				fs.mkdirSync(drawableDir, { recursive: true })
			}

			const densityFolders = [
				'drawable-hdpi',
				'drawable-xhdpi',
				'drawable-xxhdpi',
				'drawable-xxxhdpi',
			]

			if (createDensityFolders) {
				densityFolders.forEach((folder) => {
					const folderPath = path.join(androidResPath, folder)
					if (!fs.existsSync(folderPath)) {
						fs.mkdirSync(folderPath, { recursive: true })
					}
				})
			}

			const copyAssets = (sourceDir: string, targetDir: string) => {
				const files = fs.readdirSync(sourceDir)

				for (const file of files) {
					const sourcePath = path.join(sourceDir, file)
					const stat = fs.statSync(sourcePath)

					if (stat.isDirectory()) {
						const subTargetDir = path.join(targetDir, file)
						if (!fs.existsSync(subTargetDir)) {
							fs.mkdirSync(subTargetDir, { recursive: true })
						}
						copyAssets(sourcePath, subTargetDir)
					} else {
						const ext = path.extname(file).toLowerCase()
						if (extensions.includes(ext)) {
							const targetPath = path.join(targetDir, sanitizeFileName(file))

							try {
								fs.copyFileSync(sourcePath, targetPath)
							} catch (error) {
								console.error(`❌ Failed to copy ${file}:`, error)
							}
						}
					}
				}
			}

			// Sanitize filename for Android (lowercase, replace special chars)
			const sanitizeFileName = (filename: string): string => {
				const name = path.parse(filename).name
				const ext = path.parse(filename).ext

				// Android drawable names must be lowercase and only contain [a-z0-9_]
				const sanitized = name
					.toLowerCase()
					.replace(/[^a-z0-9_]/g, '_')
					.replace(/_+/g, '_') // Replace multiple underscores with single
					.replace(/^_|_$/g, '') // Remove leading/trailing underscores

				return `${sanitized}${ext}`
			}

			copyAssets(sourceDirectory, drawableDir)

			return config
		},
	])
}

export default withDrawableAssets
