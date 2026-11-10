import { TextInput } from 'react-native'

import type { JournalEditorProps } from './types'

export function JournalEditor({
	value,
	onChange,
	placeholder = 'Write some thoughts down...',
	onFocus,
	onBlur,
	lineHeight = 22,
}: JournalEditorProps) {
	return (
		<TextInput
			value={value}
			onChangeText={onChange}
			placeholder={placeholder}
			placeholderClassName="text-foreground-muted"
			onFocus={onFocus}
			onBlur={onBlur}
			multiline
			textAlignVertical="top"
			className="text-lg pb-4 w-full text-foreground"
			style={{ lineHeight, minHeight: 96 }}
			scrollEnabled={false}
			// ^ otherwise it scrolls internally which i hated
		/>
	)
}
