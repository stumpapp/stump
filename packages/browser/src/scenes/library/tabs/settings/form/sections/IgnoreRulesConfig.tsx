import { Button, CheckBox, Heading, Input, Text } from '@stump/components'
import isValidGlob from 'is-valid-glob'
import React, { useCallback, useState } from 'react'
import { useFieldArray, useFormContext, useFormState } from 'react-hook-form'

import { Schema } from '../CreateOrUpdateLibraryForm'

export default function IgnoreRulesConfig() {
	const form = useFormContext<Schema>()
	const {
		fields: ignoreRules,
		append,
		update,
	} = useFieldArray({ control: form.control, name: 'ignore_rules' })
	const { errors: formErrors } = useFormState({ control: form.control })

	const [newRule, setNewRule] = useState('')
	const [newRuleError, setNewRuleError] = useState<string>()

	/**
	 * A callback to handle adding a new ignore rule to the list of ignore rules
	 */
	const handleAddRule = useCallback(() => {
		if (!isValidGlob(newRule)) {
			setNewRuleError('Invalid glob pattern')
			return
		} else {
			setNewRuleError(undefined)
			append({
				glob: newRule,
				ignore_parents: newRule.startsWith('**/'),
				ignore_subdirs: newRule.endsWith('/**'),
			})
			setNewRule('')
		}
	}, [newRule, append])

	// TODO: determine if I really need these for editing actions... If not, remove from schema

	const handleIgnoreParentsChange = useCallback(
		(index: number, ignore: boolean) => {
			if (ignoreRules[index]) {
				update(index, {
					...ignoreRules[index],
					ignore_parents: ignore,
				})
			}
		},
		[ignoreRules, update],
	)

	const handleIgnoreSubDirsChange = useCallback(
		(index: number, ignore: boolean) => {
			if (ignoreRules[index]) {
				update(index, {
					...ignoreRules[index],
					ignore_subdirs: ignore,
				})
			}
		},
		[ignoreRules, update],
	)

	return (
		<div className="flex flex-grow flex-col gap-6">
			<div>
				<Heading size="sm">Ignore rules</Heading>
				<Text size="sm" variant="muted">
					Define glob patterns to ignore certain files or directories during a scan
				</Text>
			</div>

			<div className="flex flex-col gap-4">Existing rules TODO</div>

			<div className="flex flex-col space-y-4">
				<div className="flex items-center space-x-4">
					<Input
						label="New rule"
						value={newRule}
						onChange={(e) => setNewRule(e.target.value)}
						placeholder="**/ignore-me/**"
						description="Glob pattern to ignore files or directories"
						errorMessage={newRuleError}
						variant="primary"
					/>

					<Button type="button" disabled={!newRule} onClick={handleAddRule}>
						Add rule
					</Button>
				</div>

				<div className="flex items-center space-x-4">
					<CheckBox
						label="Ignore parents"
						title="Ignore all parent directories"
						checked={newRule.startsWith('**/')}
						onClick={() =>
							setNewRule(newRule.startsWith('**/') ? newRule.slice(3) : `**/${newRule}`)
						}
						variant="primary"
					/>
					<CheckBox
						label="Ignore subdirectories"
						title="Ignore all subdirectories"
						checked={newRule.endsWith('/**')}
						onClick={() =>
							setNewRule(newRule.endsWith('/**') ? newRule.slice(0, -3) : `${newRule}/**`)
						}
						variant="primary"
					/>
				</div>
			</div>
		</div>
	)
}

// TODO: write translation base
// const LOCALE_KEY = 'library_settings.ignore_rules'
