import type { MetadataField } from '@stump/graphql'

import {
	InlineBadgeListInput,
	InlineNumberInput,
	InlineTextInput,
} from '../../metadataEditor/cells'
import { FIELD_BINDING_NAME, FIELD_EDITOR_MAP, FIELD_VALIDATION_NAME } from '../fieldEditorConfig'
import { useMatchReviewStore } from '../useMatchReviewStore'

type Props = {
	field: MetadataField
	resolvedValue: unknown
}

export function ResolvedFieldEditor({ field, resolvedValue }: Props) {
	const setFieldOverride = useMatchReviewStore((s) => s.setFieldOverride)

	const editorType = FIELD_EDITOR_MAP[field]
	if (!editorType) return null

	switch (editorType) {
		case 'text':
			return (
				<InlineTextInput
					value={resolvedValue as string | null}
					onChange={(value) => setFieldOverride(field, { type: 'custom', value })}
					size="sm"
				/>
			)

		case 'longText':
			return (
				<InlineTextInput
					value={resolvedValue as string | null}
					onChange={(value) => setFieldOverride(field, { type: 'custom', value })}
					isLong
					size="sm"
				/>
			)

		case 'number':
			return (
				<InlineNumberInput
					value={resolvedValue as number | null}
					onChange={(value) => setFieldOverride(field, { type: 'custom', value })}
					fieldName={FIELD_VALIDATION_NAME[field]}
				/>
			)

		case 'badgeList': {
			const binding = FIELD_BINDING_NAME[field]
			if (!binding) return null
			return (
				<InlineBadgeListInput
					values={(resolvedValue as string[] | null) ?? []}
					onChange={(values) => setFieldOverride(field, { type: 'custom', value: values })}
					binding={binding}
				/>
			)
		}

		default:
			return null
	}
}
