import * as p from '@clack/prompts'
import { execaSync } from 'execa'
import { readFileSync, writeFileSync } from 'fs'
import get from 'lodash/get.js'
import has from 'lodash/has.js'
import merge from 'lodash/merge.js'
import set from 'lodash/set.js'
import unset from 'lodash/unset.js'
import { resolve } from 'path'
import { titleCase } from 'title-case'

const ROOT = process.cwd()
const LOCALES_DIR = resolve(ROOT, 'packages/i18n/src/locales')

/**
 * @param {string} text
 */
function intoPairs(text) {
	if (!text) return []
	console.log(text)
	const pairs = text.split('\n').map((pair) =>
		pair
			.trim()
			.split(',')
			.map((s) => s.trim()),
	)
	return pairs
}

async function run() {
	const enUSPath = resolve(LOCALES_DIR, 'en-US.json')
	const enUS = JSON.parse(readFileSync(enUSPath, 'utf8'))

	const text = await p.multiline({
		message:
			'Enter the old path and new path separated by a comma, and any additional replacements on separate lines',
		placeholder: 'path.to.key,new.path.to.key',
		validate: (text) => {
			if (!text) return 'stop being silly, enter something valid'
			const pairs = intoPairs(text)
			const invalidSources = pairs
				.flatMap(([sourceKey]) => sourceKey)
				.filter((key) => get(enUS, key) == null)
			if (invalidSources.length) {
				return `these do not exist in en-US.json: ${invalidSources.join(', ')}`
			}
		},
	})
	// FIXME: annoying but the multiline seems to ignore casing??

	const pairs = intoPairs(text)

	console.log(pairs)
}

run()
