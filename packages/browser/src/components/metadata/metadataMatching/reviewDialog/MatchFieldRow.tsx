import { CheckBox, cn, IconButton, Text, ToolTip } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Undo2 } from 'lucide-react'
import { useState } from 'react'

import { type FieldComparison, resolveFieldValue } from '../types'
import { useMatchReviewStore } from '../useMatchReviewStore'
import { FieldActionMenu } from './FieldActionMenu'
import { FieldValue } from './FieldValue'
import { ResolvedFieldEditor } from './ResolvedFieldEditor'
import { getDidValuesEffectivelyChange } from './utils'

type Props = {
	comparison: FieldComparison
}

export function MatchFieldRow({ comparison }: Props) {
	const { t } = useLocaleContext()
	const {
		strategy,
		excludedFields,
		toggleField,
		fieldOverrides,
		clearFieldOverride,
		getLockedFields,
	} = useMatchReviewStore()
	const { binding, currentValue, candidateValue, field } = comparison

	const excluded = excludedFields.has(field)
	const locked = getLockedFields().has(field)
	const disabled = excluded || locked
	const override = fieldOverrides.get(field)
	const resolved = resolveFieldValue(currentValue, candidateValue, strategy, excluded, override)
	const willChange = getDidValuesEffectivelyChange(currentValue, resolved)
	const hasOverride = fieldOverrides.has(field)

	const [isEditing, setIsEditing] = useState(false)

	const handleUndo = () => {
		clearFieldOverride(field)
		setIsEditing(false)
	}

	const handleEditManually = () => {
		setIsEditing(true)
	}

	return (
		<div
			className={cn(
				'group/edit py-2 pl-2.5 grid grid-cols-[140px_1fr_1fr_40px_1fr_32px] items-center bg-background',
				{
					'opacity-40': disabled,
				},
			)}
		>
			<div className="gap-1 flex items-center">
				<Text size="sm" className="font-medium">
					{t(`metadataEditor.labels.${binding}`)}
				</Text>
			</div>

			<div className="min-w-0 pr-3">
				<FieldValue value={currentValue} />
			</div>

			<div className="min-w-0 pr-3">
				<FieldValue value={candidateValue} />
			</div>

			<div className="flex justify-center">
				<ToolTip
					content={
						locked
							? t('metadataMatching.fieldLocked')
							: excluded
								? t('metadataMatching.includeField')
								: t('metadataMatching.excludeField')
					}
				>
					<CheckBox
						className={cn({
							'data-[state=unchecked]:border-primary data-[state=unchecked]:bg-primary/10':
								willChange && !disabled,
						})}
						rounded="lg"
						checked={!excluded}
						onClick={() => !locked && toggleField(comparison.field)}
						disabled={locked}
					/>
				</ToolTip>
			</div>

			<div className="min-w-0 pr-2.5">
				{isEditing && !disabled ? (
					<ResolvedFieldEditor field={field} resolvedValue={resolved} />
				) : (
					<FieldValue
						value={resolved}
						highlight={(willChange || hasOverride) && !disabled}
						compareWith={currentValue}
					/>
				)}
			</div>

			<div className="flex items-center justify-center">
				{isEditing && hasOverride && !locked ? (
					<ToolTip content={t('metadataMatching.reviewDialog.fieldAction.undoManualEdit')}>
						<IconButton variant="ghost" size="xs" onClick={handleUndo}>
							<Undo2 className="h-3.5 w-3.5" />
						</IconButton>
					</ToolTip>
				) : (
					<FieldActionMenu field={field} disabled={disabled} onEditManually={handleEditManually} />
				)}
			</div>
		</div>
	)
}
