import { Button, Card, CheckBox, cn, Heading, IconButton, Input, Text } from '@stump/components'
import isValidGlob from 'is-valid-glob'
import { Check, Edit, Trash, X } from 'lucide-react'
import React, { useCallback, useState } from 'react'
import { useFieldArray, useFormContext, useFormState } from 'react-hook-form'

import { Schema } from '../CreateOrUpdateLibraryForm'

export default function IgnoreRulesConfig() {
	const form = useFormContext<Schema>()
	const {
		fields: ignoreRules,
		append,
		update,
		remove,
	} = useFieldArray({ control: form.control, name: 'ignore_rules' })
	const { errors: formErrors } = useFormState({ control: form.control })

	console.log({ formErrors })

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
			if (ignoreRules[index]?.glob) {
				let glob = ignoreRules[index].glob as string

				if (ignore) {
					glob = glob.startsWith('**/') ? glob.slice(3) : glob
				} else {
					glob = glob.startsWith('**/') ? glob : `**/${glob}`
				}

				update(index, {
					...ignoreRules[index],
					glob,
					ignore_parents: glob.startsWith('**/'),
				})
			}
		},
		[ignoreRules, update],
	)

	const handleIgnoreSubDirsChange = useCallback(
		(index: number, ignore: boolean) => {
			if (ignoreRules[index]) {
				let glob = ignoreRules[index].glob as string

				if (ignore) {
					glob = glob.endsWith('/**') ? glob.slice(0, -3) : glob
				} else {
					glob = glob.endsWith('/**') ? glob : `${glob}/**`
				}

				update(index, {
					...ignoreRules[index],
					glob,
					ignore_subdirs: glob.endsWith('/**'),
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

			{!ignoreRules.length && (
				<Text size="sm" variant="muted">
					No ignore rules have been configured
				</Text>
			)}

			{!!ignoreRules.length && (
				<div className="flex flex-col gap-4">
					{ignoreRules.map((ignoreRule, index) => (
						<ConfiguredIgnoreRule
							key={`ignore_rule_${ignoreRule.id}`}
							id={ignoreRule.id}
							index={index}
							ignoreRule={ignoreRule}
							onToggleIgnoreParents={() =>
								handleIgnoreParentsChange(index, !ignoreRule.ignore_parents)
							}
							onToggleIgnoreSubDirs={() =>
								handleIgnoreSubDirsChange(index, !ignoreRule.ignore_subdirs)
							}
							onRemove={() => remove(index)}
						/>
					))}
				</div>
			)}

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

type ConfiguredIgnoreRuleProps = {
	index: number
	id: string
	ignoreRule: Schema['ignore_rules'][number]
	onToggleIgnoreParents: () => void
	onToggleIgnoreSubDirs: () => void
	onRemove: () => void
}

const ConfiguredIgnoreRule = ({
	ignoreRule,
	id,
	onToggleIgnoreParents,
	onToggleIgnoreSubDirs,
	onRemove,
	index,
}: ConfiguredIgnoreRuleProps) => {
	const form = useFormContext<Schema>()

	const [isEditing, setIsEditing] = useState(false)

	const [originalIgnoreRule] = useState(() => ignoreRule)

	const handleCancelEdit = useCallback(() => {
		form.setValue(`ignore_rules.${index}`, originalIgnoreRule)
		setIsEditing(false)
	}, [form, index, originalIgnoreRule])

	const renderGlob = useCallback(() => {
		if (isEditing)
			return (
				<Input
					key={id}
					className="mt-2"
					placeholder="**/ignore-me/**"
					variant="primary"
					{...form.register(`ignore_rules.${index}.glob`)}
				/>
			)
		else {
			return <pre className="text-sm">{ignoreRule.glob}</pre>
		}
	}, [form, ignoreRule, id, index, isEditing])

	const renderActions = () => {
		if (!isEditing) {
			return (
				<>
					<IconButton size="xs" onClick={() => setIsEditing(!isEditing)} type="button">
						<Edit className="h-4 w-4" />
					</IconButton>

					<IconButton size="xs" onClick={onRemove} type="button">
						<Trash className="h-4 w-4" />
					</IconButton>
				</>
			)
		} else {
			return (
				<>
					<IconButton size="xs" onClick={handleCancelEdit} type="button">
						<X className="h-4 w-4" />
					</IconButton>

					<IconButton size="xs" onClick={() => setIsEditing(false)} type="button">
						<Check className="h-4 w-4" />
					</IconButton>
				</>
			)
		}
	}

	return (
		<Card className="group flex flex-col space-y-4 px-3 py-1">
			<div
				className={cn('flex items-center justify-between', {
					'items-start': isEditing,
				})}
			>
				{renderGlob()}

				<div
					className={cn(
						'transition-opacity-[opacity_0.3s] flex items-center space-x-2 opacity-0 group-hover:opacity-100',
						{
							'mt-2': isEditing,
						},
					)}
				>
					{renderActions()}
				</div>
			</div>

			<div
				className={cn('hidden items-center space-x-4 pb-1 opacity-0 transition-[height_0.3s]', {
					'flex opacity-100': isEditing,
				})}
			>
				{/* FIXME: these don't work while editing... */}
				<CheckBox
					label="Ignore parents"
					title="Ignore all parent directories"
					checked={ignoreRule.ignore_parents}
					onClick={onToggleIgnoreParents}
					variant="primary"
				/>
				<CheckBox
					label="Ignore subdirectories"
					title="Ignore all subdirectories"
					checked={ignoreRule.ignore_subdirs}
					onClick={onToggleIgnoreSubDirs}
					variant="primary"
				/>
			</div>
		</Card>
	)
}
