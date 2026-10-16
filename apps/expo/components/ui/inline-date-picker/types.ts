export type InlineDatePickerComponent = 'date' | 'hourAndMinute'

// TODO: created this for start/end session info, thus not needing nullish, but perhaps
// supporting it will need to happen at some point

export type InlineDatePickerProps = {
	value: Date
	onChange: (date: Date) => void
	displayedComponents?: InlineDatePickerComponent[]
}
