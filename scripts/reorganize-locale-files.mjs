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
// TODO: ^ this is tricky because its just english, i may just have to rely on folks
// helping to retranslate to get non-en to case properly

/**
 *
 * @param {string} localeFilePath
 */
function reorganizeLocaleFile(localeFilePath) {
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
	const dummyPath = resolve(LOCALES_DIR, 'dummy.json')
	writeFileSync(dummyPath, JSON.stringify(newLocaleData, null, 2), 'utf8')
}

// keys in migrated files which should be left alone
let titleCaseExclusionsList = []
// TODO: maybe do a brief manual pass too?

function generateTitleCaseExclusionsList() {
	const enUSPath = resolve(LOCALES_DIR, 'en-US.json')
	const localeData = JSON.parse(readFileSync(enUSPath, 'utf8'))

	// collect all keys recursively which have >3 words

	function collectKeys(obj, prefix = '') {
		for (const key in obj) {
			const value = obj[key]
			const fullKey = prefix ? `${prefix}.${key}` : key

			if (typeof value === 'string') {
				const wordCount = value.trim().split(/\s+/).length
				if (wordCount > 3) {
					titleCaseExclusionsList.push(fullKey)
				}
			} else if (typeof value === 'object' && value != null) {
				collectKeys(value, fullKey)
			}
		}
	}

	collectKeys(localeData)

	console.log('Title case exclusions list generated:', titleCaseExclusionsList)
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
				if (!titleCaseExclusionsList.includes(fullKey)) {
					obj[key] = titleCase(value, {
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

	const outputPath = resolve(LOCALES_DIR, `${locale}-test.json`)
	writeFileSync(outputPath, JSON.stringify(localeData, null, 2), 'utf8')
}

function run() {
	// for each locale file:
	// 1. every key not in mobileApp moves into webApp
	// 2. webApp.common moves into shared.common
	// 3. mobileApp.common moves into shared.common, overwriting shared keys
	//
	// just trying with en-us for now until i get it right:
	// const enUSPath = resolve(LOCALES_DIR, 'en-US.json')
	// reorganizeLocaleFile(enUSPath)

	generateTitleCaseExclusionsList()
	migrateAllToTitleCase(
		JSON.parse(readFileSync(resolve(LOCALES_DIR, 'en-US.json'), 'utf8')),
		'en-US',
	)
}

run()
