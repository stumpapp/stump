export type PickerOption<T extends string = string> = {
	label: string
	value: T
}

export type PickerProps<T extends string = string> = {
	value: T
	options: PickerOption<T>[]
	onValueChange: (value: T) => void
	disabled?: boolean
	placeholder?: string
	className?: string
}
