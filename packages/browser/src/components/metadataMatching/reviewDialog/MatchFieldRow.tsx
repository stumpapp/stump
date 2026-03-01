import { CheckBox, cn, Text, ToolTip } from '@stump/components'

import { type FieldComparison, resolveFieldValue } from '../types'
import { useMatchReviewStore } from '../useMatchReviewStore'
import { FieldValue } from './FieldValue'

type Props = {
	comparison: FieldComparison
}

// TODO: Shove an editor from MetadataEditor in here somehow, UGH so much work lol

export function MatchFieldRow({ comparison }: Props) {
	const { strategy, excludedFields, toggleField } = useMatchReviewStore()
	const { label, currentValue, candidateValue, field } = comparison

	const excluded = excludedFields.has(field)
	const resolved = resolveFieldValue(currentValue, candidateValue, strategy, excluded)
	const willChange = JSON.stringify(resolved) !== JSON.stringify(currentValue)

	return (
		<div
			className={cn(
				'grid grid-cols-[140px_1fr_1fr_40px_1fr] items-center bg-background py-2 pl-2.5',
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
				<FieldValue
					value={resolved}
					highlight={willChange && !excluded}
					compareWith={currentValue}
				/>
			</div>
		</div>
	)
}
