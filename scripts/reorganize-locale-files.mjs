import { execaSync } from 'execa'
import { readFileSync, writeFileSync } from 'fs'
import get from 'lodash/get.js'
import has from 'lodash/has.js'
import remove from 'lodash/remove.js'
import set from 'lodash/set.js'
import { resolve } from 'path'
import { titleCase } from 'title-case'

const ROOT = process.cwd()
const LOCALES_DIR = resolve(ROOT, 'packages/i18n/src/locales')

// at least what i am aiming to get as an end result
const NAMESPACES = ['mobileApp', 'webApp', 'shared']
// ^ could also do desktopApp? not now ig

// yoink! https://github.com/ianstormtaylor/title-case-minors/blob/master/index.js
const SMALL_WORDS = new Set([
	'a',
	'an',
	'and',
	'as',
	'at',
	'be',
	'but',
	'by',
	'en',
	'for',
	'from',
	'how',
	'if',
	'in',
	'is',
	'it',
	'oh',
	'neither',
	'nor',
	'of',
	'on',
	'only',
	'onto',
	'out',
	'or',
	'per',
	'so',
	'than',
	'that',
	'the',
	'to',
	'until',
	'up',
	'upon',
	'v',
	'v.',
	'versus',
	'vs',
	'vs.',
	'via',
	'when',
	'with',
	'without',
	'yet',
])

function titleCasePreservingPlaceholders(value, options) {
	const placeholders = value.match(/{{.*?}}/g) ?? []
	let index = 0
	return titleCase(value, options).replace(/{{.*?}}/g, () => placeholders[index++])
}

/**
 *
 * @param {string} localeFilePath
 */
function reorganizeLocaleFile(localeFilePath) {
	const locale = localeFilePath.split('/').pop().replace('.json', '')
	const localeData = JSON.parse(readFileSync(localeFilePath, 'utf8'))

	const newLocaleData = {
		mobileApp: localeData.mobileApp || {},
		webApp: localeData.webApp || {},
		shared: localeData.shared || {},
	}

	// move keys from root to webApp, only non-namespaced ones
	for (const key of Object.keys(localeData)) {
		if (!NAMESPACES.includes(key)) {
			set(newLocaleData, ['webApp', key], localeData[key])
		}
	}

	// move webApp.common to shared.common
	if (has(newLocaleData, ['webApp', 'common'])) {
		set(newLocaleData, ['shared', 'common'], get(newLocaleData, ['webApp', 'common']))
		remove(newLocaleData, ['webApp', 'common'])
	}

	// merge commons with preference for mobile
	if (has(newLocaleData, ['mobileApp', 'common'])) {
		const mobileCommon = get(newLocaleData, ['mobileApp', 'common'])
		const sharedCommon = get(newLocaleData, ['shared', 'common'], {})
		const mergedCommon = { ...sharedCommon, ...mobileCommon }
		set(newLocaleData, ['shared', 'common'], mergedCommon)
		remove(newLocaleData, ['mobileApp', 'common'])
	}
	writeFileSync(localeFilePath, JSON.stringify(newLocaleData, null, 2), 'utf8')

	if (localeFilePath.endsWith('en-US.json')) {
		generateTitleCaseExclusionsList()
	}

	if (locale.startsWith('en-')) {
		migrateAllToTitleCase(newLocaleData, locale)
	}
}

// keys in migrated files which should be left alone
let titleCaseExclusionsList = [
	'mobileApp.readingSessions', // meant to be sentences
]
// TODO:more!

function generateTitleCaseExclusionsList() {
	const enUSPath = resolve(LOCALES_DIR, 'en-US.json')
	const localeData = JSON.parse(readFileSync(enUSPath, 'utf8'))

	function collectKeys(obj, prefix = '') {
		for (const key in obj) {
			const value = obj[key]
			const fullKey = prefix ? `${prefix}.${key}` : key

			if (typeof value === 'string') {
				const wordCount = value.trim().split(/\s+/).length
				if (wordCount > 4) {
					titleCaseExclusionsList.push(fullKey)
				}
			} else if (typeof value === 'object' && value != null) {
				collectKeys(value, fullKey)
			}
		}
	}

	collectKeys(localeData)

	// console.log('Title case exclusions list generated:', titleCaseExclusionsList)
}

/**
 *
 * @param {Record<string, unknown>} localeData
 * @param {string} locale
 */
function migrateAllToTitleCase(localeData, locale) {
	function walkAndMigrate(obj, prefix = '') {
		for (const key in obj) {
			const value = obj[key]
			const fullKey = prefix ? `${prefix}.${key}` : key

			if (typeof value === 'string') {
				const isExcludedKey = titleCaseExclusionsList.includes(fullKey)
				const isExcludedKeyViaParent = titleCaseExclusionsList.some((excludedKey) =>
					fullKey.startsWith(`${excludedKey}.`),
				)
				if (!isExcludedKey && !isExcludedKeyViaParent) {
					obj[key] = titleCasePreservingPlaceholders(value, {
						locale,
						// yoink! https://github.com/ianstormtaylor/title-case-minors/blob/master/index.js
						smallWords: SMALL_WORDS,
					})
				}
			} else if (typeof value === 'object' && value != null) {
				walkAndMigrate(value, fullKey)
			}
		}
	}

	walkAndMigrate(localeData)

	const outputPath = resolve(LOCALES_DIR, `${locale}.json`)
	writeFileSync(outputPath, JSON.stringify(localeData, null, 2), 'utf8')
}

// function findPlaceholderValues() {
// 	const enUSPath = resolve(LOCALES_DIR, 'en-US.json')
// 	const localeData = JSON.parse(readFileSync(enUSPath, 'utf8'))
//
// 	const placeholderValues = []
//
// 	function walkAndFindPlaceholders(obj, prefix = '') {
// 		for (const key in obj) {
// 			const value = obj[key]
// 			const fullKey = prefix ? `${prefix}.${key}` : key
//
// 			if (typeof value === 'string') {
// 				// for EVERY instance of {{name}} in the string, add it to the list
// 				const regex = /{{(.*?)}}/g
// 				let match
// 				while ((match = regex.exec(value)) !== null) {
// 					placeholderValues.push(`{{${match[1]}}}`)
// 				}
// 			} else if (typeof value === 'object' && value != null) {
// 				walkAndFindPlaceholders(value, fullKey)
// 			}
// 		}
// 	}
//
// 	walkAndFindPlaceholders(localeData)
//
// 	const uniquePlaceholders = [...new Set(placeholderValues)]
// 	console.log('Unique placeholder values found:', uniquePlaceholders)
// }

function run() {
	// findPlaceholderValues()

	const { stdout } = execaSync('ls', [LOCALES_DIR], { encoding: 'utf8' })

	const localeFiles = stdout
		.split('\n')
		.filter((file) => file.endsWith('.json'))
		.map((file) => resolve(LOCALES_DIR, file))

	const enUSPath = resolve(LOCALES_DIR, 'en-US.json')
	reorganizeLocaleFile(enUSPath)

	// for (const localeFilePath of localeFiles) {
	// 	reorganizeLocaleFile(localeFilePath)
	// }
}

run()
