import { readFileSync, writeFileSync } from 'fs'
import get from 'lodash/get.js'
import has from 'lodash/has.js'
import remove from 'lodash/remove.js'
import set from 'lodash/set.js'
import { resolve } from 'path'

const ROOT = process.cwd()
const LOCALES_DIR = resolve(ROOT, 'packages/i18n/src/locales')

// at least what i am aiming to get as an end result
const NAMESPACES = ['mobileApp', 'webApp', 'shared']
// ^ could also do desktopApp? not now ig

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

function run() {
	// for each locale file:
	// 1. every key not in mobileApp moves into webApp
	// 2. webApp.common moves into shared.common
	// 3. mobileApp.common moves into shared.common, overwriting shared keys
	//
	// just trying with en-us for now until i get it right:
	const enUSPath = resolve(LOCALES_DIR, 'en-us.json')
	reorganizeLocaleFile(enUSPath)
}

run()
