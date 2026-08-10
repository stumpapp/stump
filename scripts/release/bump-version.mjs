#!/usr/bin/env node

import * as p from '@clack/prompts'
import { defineCommand, runMain } from 'citty'
import { execa } from 'execa'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

/**
 * increments a semver version according to bump
 *
 * @param {string} version
 * @param {'major' | 'minor' | 'patch'} type
 * @returns {string}
 */
function bumpVersion(version, type) {
	const [major, minor, patch] = version.split('.').map(Number)

	if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
		throw new Error(`how did you even get here? ${version} is not valid semver`)
	}

	if (type === 'major') return `${major + 1}.0.0`
	if (type === 'minor') return `${major}.${minor + 1}.0`
	if (type === 'patch') return `${major}.${minor}.${patch + 1}`

	throw new Error(`unknown bump type: ${type}`)
}

const VALID_BUMPS = /** @type {const} */ (['major', 'minor', 'patch'])

const main = defineCommand({
	meta: {
		name: 'bump-version',
		description: 'bump the semver version where applicable',
	},
	args: {
		bump: {
			type: 'string',
			description: '(major, minor, patch)',
			alias: 'b',
		},
		changelog: {
			type: 'boolean',
			description: 'generate changelog after bumping',
			default: true,
		},
	},
	async run({ args }) {
		p.intro('Stump version bump tool')

		if (args.bump && !VALID_BUMPS.includes(args.bump)) {
			p.log.error(`invalid --bump value "${args.bump}"`)
			process.exit(1)
		}

		/** @type{string} */
		const currentVersion = JSON.parse(readFileSync(resolve('package.json'), 'utf8')).version
		const isScripted = Boolean(args.bump)

		let bump = args.bump

		if (!bump) {
			const selected = await p.select({
				message: `current version is ${currentVersion}. choose bump:`,
				options: VALID_BUMPS.map((type) => ({
					value: type,
					label: `${type.padEnd(6)}  ${currentVersion} -> ${bumpVersion(currentVersion, type)}`,
				})),
			})

			if (p.isCancel(selected)) {
				p.cancel('ok nvm')
				process.exit(0)
			}

			bump = selected
		}

		const newVersion = bumpVersion(currentVersion, bump)

		let generateChangelog = args.changelog

		if (!isScripted) {
			const confirmed = await p.confirm({
				message: 'generate changelog entry?',
				initialValue: true,
			})

			if (p.isCancel(confirmed)) {
				p.cancel('ok nvm')
				process.exit(0)
			}

			generateChangelog = confirmed
		}

		if (!isScripted) {
			const proceed = await p.confirm({
				message: `bump ${currentVersion} -> ${newVersion}?`,
				initialValue: true,
			})

			if (p.isCancel(proceed) || !proceed) {
				p.cancel('ok nvm')
				process.exit(0)
			}
		}

		const rustSpinner = p.spinner()
		rustSpinner.start('adjusting rust workspace')
		try {
			const changes = await setRustVersion(newVersion)
			rustSpinner.stop('workspace version updated')
			for (const { file, previous, next } of changes) {
				p.log.info(`${file}: ${previous} -> ${next}`)
			}
		} catch (err) {
			rustSpinner.stop('rust update failed!')
			p.log.error(err.message)
			process.exit(1)
		}

		const jsSpinner = p.spinner()
		jsSpinner.start('adjusting js package versions')
		try {
			const changes = await setJsVersion(newVersion)
			jsSpinner.stop('js package versions updated')
			for (const { file, previous, next } of changes) {
				p.log.info(`${file}: ${previous} -> ${next}`)
			}
		} catch (err) {
			jsSpinner.stop('js update failed!')
			p.log.error(err.message)
			process.exit(1)
		}

		if (generateChangelog) {
			const changelogSpinner = p.spinner()
			changelogSpinner.start('generating changelog')
			try {
				await execa('yarn', ['gitmoji-changelog', '--output', './.github/CHANGELOG.md'])
				changelogSpinner.stop('updates written to .github/CHANGELOG.md')
			} catch (err) {
				changelogSpinner.stop('changelog generation failed!')
				p.log.error(err.message)
				process.exit(1)
			}
		}

		p.outro(`Version bumped to ${newVersion} 🎉`)
	},
})

runMain(main)

// i only added the user-facing ones here, figure the rest don't matter much
const TARGETS = ['package.json', 'apps/web/package.json', 'apps/desktop/package.json']

/**
 * update the version in each target package.json
 *
 * @param {string} version the new semver version string
 * @returns {Promise<{ file: string, previous: string, next: string }[]>}
 */
export async function setJsVersion(version) {
	const changes = []

	for (const target of TARGETS) {
		const path = resolve(target)

		let pkg
		try {
			pkg = JSON.parse(readFileSync(path, 'utf8'))
		} catch (err) {
			throw new Error(`Could not read ${target}: ${err.message}`)
		}

		const previous = pkg.version
		pkg.version = version

		writeFileSync(path, JSON.stringify(pkg, null, '\t') + '\n')

		changes.push({ file: target, previous, next: version })
	}

	try {
		await execa('yarn', ['prettier', '--write', ...TARGETS])
	} catch (err) {
		throw new Error(`prettier failed: ${err.message}`)
	}

	return changes
}

const CARGO_TOML = 'Cargo.toml'

/**
 * updates the cargo workspace version
 *
 * @param {string} version the new semver version string
 * @returns {Promise<{ file: string, previous: string, next: string }[]>}
 */
export async function setRustVersion(version) {
	const changes = []

	const cargoPath = resolve(CARGO_TOML)
	const cargoContent = readFileSync(cargoPath, 'utf8')

	const previousCargoVersion = cargoContent.match(
		/^\[workspace\.package\][\s\S]*?^version\s*=\s*"([^"]+)"/m,
	)?.[1]
	if (!previousCargoVersion) {
		throw new Error(
			'you messed up the Cargo.toml format, could not find [workspace.package] version field',
		)
	}

	writeFileSync(cargoPath, updateCargoVersion(cargoContent, version))
	changes.push({ file: CARGO_TOML, previous: previousCargoVersion, next: version })

	return changes
}

/**
 * updates the version in the [workspace.package] section of Cargo.toml
 *
 * @param {string} content - The full Cargo.toml content
 * @param {string} version - The new version string
 * @returns {string} Updated content
 */
function updateCargoVersion(content, version) {
	let inWorkspacePackage = false
	let replaced = false

	// a bit scuffed but its a devtool its fine
	const lines = content.split('\n').map((line) => {
		if (/^\[workspace\.package\]/.test(line)) {
			inWorkspacePackage = true
			return line
		}
		// any new section header ends the workspace.package block
		if (inWorkspacePackage && /^\[/.test(line)) {
			inWorkspacePackage = false
		}
		if (inWorkspacePackage && !replaced && /^version\s*=/.test(line)) {
			replaced = true
			return `version = "${version}"`
		}
		return line
	})

	if (!replaced) {
		throw new Error('Could not find version field in [workspace.package] in Cargo.toml')
	}

	return lines.join('\n')
}
