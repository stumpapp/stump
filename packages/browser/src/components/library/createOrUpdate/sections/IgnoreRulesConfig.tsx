import {
	Button,
	Card,
	CheckBox,
	cn,
	Heading,
	IconButton,
	Input,
	Text,
	ToolTip,
} from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { AnimatePresence, motion } from 'framer-motion'
import isValidGlob from 'is-valid-glob'
import { Check, Edit, Lock, Slash, SquareAsterisk, Trash, Unlock, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'

import { useLibraryContextSafe } from '@/scenes/library/context'

import { CreateOrUpdateLibrarySchema } from '../schema'

const LOCALE_KEY = 'createOrUpdateLibraryForm'
const getKey = (key: string) => `${LOCALE_KEY}.fields.ignoreRules.${key}`

export default function IgnoreRulesConfig() {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()
	const ctx = useLibraryContextSafe()
	const {
		fields: ignoreRules,
		append,
		remove,
	} = useFieldArray({ control: form.control, name: 'ignore_rules' })
	const { t } = useLocaleContext()

	const isCreatingLibrary = !ctx?.library

	/**
	 * A state to track whether the ignore rules are currently being edited. By default, we set this
	 * to true if the library is being created
	 */
	const [isEditing, setIsEditing] = useState(() => isCreatingLibrary)
	/**
	 * A local state to track the value of the new ignore rule being added, if any
	 */
	const [newRule, setNewRule] = useState('')
	/**
	 * An error message to display if the new ignore rule is invalid (i.e. not a valid glob pattern)
	 */
	const [newRuleError, setNewRuleError] = useState<string>()

	/**
	 * A callback to handle adding a new ignore rule to the list of ignore rules
	 */
	const handleAddRule = useCallback(() => {
		if (!isValidGlob(newRule)) {
			setNewRuleError(t(getKey('invalidGlob')))
			return
		}

		const isDuplicate = ignoreRules.some((rule) => rule.glob === newRule)
		if (isDuplicate) {
			setNewRuleError(t(getKey('duplicateGlob')))
			return
		}

		setNewRuleError(undefined)
		append({
			glob: newRule,
			ignore_parents: newRule.startsWith('**/'),
			ignore_subdirs: newRule.endsWith('/**'),
		})
		setNewRule('')
	}, [newRule, append, t])

	/**
	 * A function to render the lock/unlock button, which disables/enables editing of ignore rules
	 */
	const renderLockedButton = () => {
		const Icon = isEditing ? Unlock : Lock
		const help = isEditing ? t(getKey('lockConfig.lock')) : t(getKey('lockConfig.unlock'))

		return (
			<ToolTip content={help} align="end" size="sm">
				<IconButton
					aria-label={help}
					onClick={() => setIsEditing(!isEditing)}
					variant="ghost"
					size="sm"
				>
					<Icon className="h-4 w-4 text-foreground-muted" />
				</IconButton>
			</ToolTip>
		)
	}

	const renderSaveButton = useCallback(() => {
		if (!ctx?.library) {
			return null
		}

		const existingRules = ctx.library.config.ignore_rules
		const newRules = ignoreRules.map((rule) => rule.glob)

		/**
		 * length increased -> added at least one thing -> has changes,
		 * length decreased -> removed at least one thing -> has changes,
		 * same length -> check if something has been removed -> if so: has changes, if not: no changes
		 */
		const hasChanges =
			existingRules?.length !== newRules.length ||
			!existingRules.every((glob) => newRules.includes(glob))

		return (
			<div>
				<Button
					title={hasChanges ? undefined : t('common.noChanges')}
					type="submit"
					disabled={!hasChanges}
					variant="primary"
					className="mt-4"
				>
					{t(getKey('save'))}
				</Button>
			</div>
		)
	}, [ctx, ignoreRules, t])

	return (
		<div className="flex max-w-2xl flex-grow flex-col gap-6">
			<div className="flex items-center justify-between">
				<div>
					<Heading size="sm">{t(getKey('section.heading'))}</Heading>
					<Text size="sm" variant="muted">
						{t(getKey('section.description'))}
					</Text>
				</div>

				{renderLockedButton()}
			</div>

			{!ignoreRules.length && (
				<Card className="flex items-center justify-center border-dashed border-edge-subtle p-6">
					<div className="flex flex-col space-y-3">
						<div className="relative flex justify-center">
							<span className="flex items-center justify-center rounded-xl bg-background-surface p-2">
								<SquareAsterisk className="h-6 w-6 text-foreground-muted" />
								<Slash className="absolute h-6 w-6 scale-x-[-1] transform text-foreground opacity-80" />
							</span>
						</div>

						<div className="text-center">
							<Text size="sm" variant="muted">
								{t(getKey('noRules'))}
							</Text>
						</div>
					</div>
				</Card>
			)}

			{!!ignoreRules.length && (
				<Card className="flex flex-col">
					{ignoreRules.map((ignoreRule, index) => (
						<ConfiguredIgnoreRule
							key={`ignore_rule_${ignoreRule.id}`}
							id={ignoreRule.id}
							index={index}
							ignoreRule={ignoreRule}
							isReadOnly={!isEditing}
							onRemove={() => remove(index)}
						/>
					))}
				</Card>
			)}

			<AnimatePresence>
				{isEditing && (
					<motion.div
						className="flex flex-col space-y-4"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.15 }}
					>
						<div className="flex items-center space-x-4">
							<Input
								className="font-mono"
								label={t(getKey('addRule.label'))}
								value={newRule}
								onChange={(e) => setNewRule(e.target.value)}
								placeholder="**/ignore-me/**"
								description={t(getKey('addRule.description'))}
								errorMessage={newRuleError}
								variant="primary"
							/>

							<Button type="button" disabled={!newRule} onClick={handleAddRule}>
								{t(getKey('addRule.addButton'))}
							</Button>
						</div>

						<div className="flex items-center space-x-4">
							<CheckBox
								id="ignoreParents"
								label={t(getKey('addRule.ignoreParents.label'))}
								title={t(getKey('addRule.ignoreParents.title'))}
								checked={newRule.startsWith('**/')}
								onClick={() =>
									setNewRule(newRule.startsWith('**/') ? newRule.slice(3) : `**/${newRule}`)
								}
								variant="primary"
							/>
							<CheckBox
								id="ignoreSubdirs"
								label={t(getKey('addRule.ignoreSubdirs.label'))}
								title={t(getKey('addRule.ignoreSubdirs.title'))}
								checked={newRule.endsWith('/**')}
								onClick={() =>
									setNewRule(newRule.endsWith('/**') ? newRule.slice(0, -3) : `${newRule}/**`)
								}
								variant="primary"
							/>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{renderSaveButton()}
		</div>
	)
}

type ConfiguredIgnoreRuleProps = {
	index: number
	id: string
	ignoreRule: CreateOrUpdateLibrarySchema['ignore_rules'][number]
	isReadOnly?: boolean
	onRemove: () => void
}

const ConfiguredIgnoreRule = ({
	ignoreRule,
	id,
	isReadOnly,
	onRemove,
	index,
}: ConfiguredIgnoreRuleProps) => {
	const form = useFormContext<CreateOrUpdateLibrarySchema>()

	const [isEditing, setIsEditing] = useState(false)
	const [originalIgnoreRule] = useState(() => ignoreRule)

	const { t } = useLocaleContext()

	const handleCancelEdit = useCallback(() => {
		form.setValue(`ignore_rules.${index}`, originalIgnoreRule)
		setIsEditing(false)
	}, [form, index, originalIgnoreRule])

	const handleChangeIsEditing = useCallback(
		(value: boolean) => {
			if (!isReadOnly) {
				setIsEditing(value)
			}
		},
		[isReadOnly],
	)

	const handleRemove = useCallback(() => {
		if (!isReadOnly) {
			onRemove()
		}
	}, [isReadOnly, onRemove])

	const renderGlob = useCallback(() => {
		if (isEditing)
			return (
				<Input
					key={id}
					className="font-mono"
					placeholder="**/ignore-me/**"
					variant="primary"
					{...form.register(`ignore_rules.${index}.glob`)}
				/>
			)
		else {
			return <pre className="px-3 py-2 text-sm">{ignoreRule.glob}</pre>
		}
	}, [form, ignoreRule, id, index, isEditing])

	const renderActions = () => {
		if (isReadOnly) {
			return null
		} else if (!isEditing) {
			return (
				<>
					<ToolTip content={t(getKey('editRule'))} align="end" size="sm">
						<IconButton size="xs" onClick={() => handleChangeIsEditing(!isEditing)} type="button">
							<Edit className="h-4 w-4" />
						</IconButton>
					</ToolTip>

					<ToolTip content={t(getKey('deleteRule'))} align="end" size="sm">
						<IconButton size="xs" onClick={handleRemove} type="button">
							<Trash className="h-4 w-4" />
						</IconButton>
					</ToolTip>
				</>
			)
		} else {
			return (
				<>
					<ToolTip content={t(getKey('cancelEdit'))} align="end" size="sm">
						<IconButton size="xs" onClick={handleCancelEdit} type="button">
							<X className="h-4 w-4" />
						</IconButton>
					</ToolTip>

					<ToolTip content={t(getKey('confirmEdit'))} align="end" size="sm">
						<IconButton size="xs" onClick={() => handleChangeIsEditing(false)} type="button">
							<Check className="h-4 w-4" />
						</IconButton>
					</ToolTip>
				</>
			)
		}
	}

	return (
		<div className="group flex flex-col space-y-4 px-3 py-1 even:bg-background-surface/50">
			<div
				className={cn('flex items-center justify-between', {
					'items-center': isEditing,
				})}
			>
				{renderGlob()}

				<div
					className={cn('transition-opacity-[opacity_0.3s] flex items-center space-x-2', {
						'opacity-0 group-hover:opacity-100': !isEditing,
					})}
				>
					{renderActions()}
				</div>
			</div>
		</div>
	)
}
