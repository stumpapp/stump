import { TextInput } from 'react-native'

import { useTranslate } from '~/lib/hooks'

import type { JournalEditorProps } from './types'

export function JournalEditor({
	value,
	onChange,
	placeholder,
	onFocus,
	onBlur,
	lineHeight = 22,
}: JournalEditorProps) {
	const { translate } = useTranslate()
	return (
		<TextInput
			value={value}
			onChangeText={onChange}
			placeholder={placeholder ?? translate('shared.readingJournal.editorPlaceholder')}
			placeholderClassName="text-foreground-muted"
			onFocus={onFocus}
			onBlur={onBlur}
			multiline
			textAlignVertical="top"
			className="text-lg pb-4 w-full text-foreground"
			style={{ lineHeight }}
			scrollEnabled={false}
			// ^ otherwise it scrolls internally which i hated
		/>
	)
}
