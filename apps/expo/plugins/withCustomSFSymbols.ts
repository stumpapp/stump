import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { withDangerousMod } from '@expo/config-plugins'
import { type ExpoConfig } from 'expo/config'

type SymbolDefinition = {
	name: string
	svgPath: string
}

type WithCustomSFSymbolsOptions = {
	symbols: SymbolDefinition[]
}

// https://developer.apple.com/documentation/uikit/configuring-and-displaying-symbol-images-in-your-ui
export default function withCustomSFSymbols(
	config: ExpoConfig,
	options: WithCustomSFSymbolsOptions,
) {
	return withDangerousMod(config, [
		'ios',
		async (config) => {
			const projectRoot = config.modRequest.projectRoot
			const xcassetsPath = join(
				config.modRequest.platformProjectRoot,
				config.modRequest.projectName || 'Stump',
				'Images.xcassets',
			)

			if (!existsSync(xcassetsPath)) {
				console.warn(`xcassets directory not found at ${xcassetsPath}`)
				return config
			}

			for (const symbol of options.symbols) {
				const symbolsetPath = join(xcassetsPath, `${symbol.name}.symbolset`)
				const contentsPath = join(symbolsetPath, 'Contents.json')
				const svgFileName = `${symbol.name}.svg`
				const svgDestPath = join(symbolsetPath, svgFileName)

				await mkdir(symbolsetPath, { recursive: true })

				const sourceSvgPath = join(projectRoot, symbol.svgPath)
				if (!existsSync(sourceSvgPath)) {
					console.warn(`SVG file not found at ${sourceSvgPath}`)
					continue
				}

				const svgContent = await readFile(sourceSvgPath, 'utf-8')
				await writeFile(svgDestPath, svgContent, 'utf-8')

				const contentsJson = {
					info: {
						author: 'xcode',
						version: 1,
					},
					symbols: [
						{
							filename: svgFileName,
							idiom: 'universal',
						},
					],
				}

				await writeFile(contentsPath, JSON.stringify(contentsJson, null, 2), 'utf-8')
			}

			return config
		},
	])
}
