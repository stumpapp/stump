import { TextInput, type TextInputProps } from 'react-native'

// TODO(reading-timeline): make rich editor:
// 1. consider native module for UITextView -> https://developer.apple.com/documentation/uikit/uitextview/allowseditingtextattributes
//    problem would be Android lack of parity, which would be worse if the text output is not easily
//    strippable to plain text (a cursory glance says it should be but idk for sure yet)
// 2. markdown editor with preview mode (default) with manual edit trigger to see raw md to edit. i personally
//    really dislike the live md editing so would rather not do that if possible? idk i guesss it depends,
//    i don't see myself using it too much outside bolds/italics
export type JournalEditorProps = {
	value: string
	onChange: (value: string) => void
} & Omit<TextInputProps, 'value' | 'onChange' | 'onChangeText' | 'multiline'>

export function JournalEditor({
	value,
	onChange,
	placeholder = 'Write some thoughts down...',
	...props
}: JournalEditorProps) {
	return (
		<TextInput
			value={value}
			onChangeText={onChange}
			placeholder={placeholder}
			placeholderClassName="text-foreground-muted"
			multiline
			textAlignVertical="top"
			className="text-lg w-full text-foreground"
			style={{ minHeight: 50, lineHeight: 22 }}
			{...props}
		/>
	)
}
