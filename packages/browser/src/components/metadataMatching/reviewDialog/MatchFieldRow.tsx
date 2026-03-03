import { CheckBox, cn, IconButton, Text, ToolTip } from '@stump/components'
import { Check, Pencil, Undo2 } from 'lucide-react'
import { useState } from 'react'

import { FIELD_EDITOR_MAP } from '../fieldEditorConfig'
import { type FieldComparison, resolveFieldValue } from '../types'
import { useMatchReviewStore } from '../useMatchReviewStore'
import { FieldValue } from './FieldValue'
import { ResolvedFieldEditor } from './ResolvedFieldEditor'
import { getDidValuesEffectivelyChange } from './utils'

type Props = {
	comparison: FieldComparison
}

export function MatchFieldRow({ comparison }: Props) {
	const { strategy, excludedFields, toggleField, fieldOverrides, clearFieldOverride } =
		useMatchReviewStore()
	const { label, currentValue, candidateValue, field } = comparison

	const excluded = excludedFields.has(field)
	const override = fieldOverrides.get(field)
	const resolved = resolveFieldValue(currentValue, candidateValue, strategy, excluded, override)
	const willChange = getDidValuesEffectivelyChange(currentValue, resolved)
	const hasOverride = fieldOverrides.has(field)
	const hasEditor = !!FIELD_EDITOR_MAP[field]

	const [isEditing, setIsEditing] = useState(false)

	const handleUndo = () => {
		clearFieldOverride(field)
		setIsEditing(false)
	}

	return (
		<div
			className={cn(
				'group/edit grid grid-cols-[140px_1fr_1fr_40px_1fr_32px] items-center bg-background py-2 pl-2.5',
				{
					'opacity-40': excluded,
				},
			)}
		>
			<Text size="sm" className="font-medium">
				{label}
			</Text>

			<div className="min-w-0 pr-3">
				<FieldValue value={currentValue} />
			</div>

			<div className="min-w-0 pr-3">
				<FieldValue value={candidateValue} />
			</div>

			<div className="flex justify-center">
				<ToolTip content={excluded ? 'Include this field' : 'Exclude this field'}>
					<CheckBox
						variant={willChange && !excluded ? 'primary' : 'default'}
						rounded="lg"
						checked={!excluded}
						onClick={() => toggleField(comparison.field)}
					/>
				</ToolTip>
			</div>

			<div className="min-w-0 pr-2.5">
				{isEditing && !excluded ? (
					<ResolvedFieldEditor field={field} resolvedValue={resolved} />
				) : (
					<FieldValue
						value={resolved}
						highlight={(willChange || hasOverride) && !excluded}
						compareWith={currentValue}
					/>
				)}
			</div>

			<div className="flex justify-center">
				{hasEditor && !excluded && (
					<>
						{hasOverride ? (
							<ToolTip content="Undo manual edit">
								<IconButton variant="ghost" size="xs" onClick={handleUndo}>
									<Undo2 className="h-3.5 w-3.5" />
								</IconButton>
							</ToolTip>
						) : (
							<ToolTip content="Edit resolved value">
								<IconButton
									className={cn(
										'opacity-0 transition-opacity duration-150 group-hover/edit:opacity-100',
										{
											'opacity-100': isEditing,
										},
									)}
									variant="ghost"
									size="xs"
									onClick={() => setIsEditing((prev) => !prev)}
								>
									{isEditing ? (
										<Check className="h-3.5 w-3.5" />
									) : (
										<Pencil className="h-3.5 w-3.5" />
									)}
								</IconButton>
							</ToolTip>
						)}
					</>
				)}
			</div>
		</div>
	)
}
