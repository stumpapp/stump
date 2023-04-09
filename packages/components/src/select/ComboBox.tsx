import { Check, ChevronsUpDown } from 'lucide-react'
import { Fragment, useState } from 'react'

import { Button, Command, Label, Popover, Text } from '..'
import { cn } from '../utils'

// TODO: customize multi display value, e.g. "2 items selected"
export type ComboBoxOption = {
	label: string
	value: string
}

type SingleSelectComboBoxProps = {
	isMultiSelect?: false
	value?: string
	onChange?: (value?: string) => void
}
type MultiSelectComboBoxProps = {
	isMultiSelect: true
	value?: string[]
	onChange?: (value?: string[]) => void
}

const SIZE_VARIANTS = {
	default: 'w-[200px]',
	full: 'w-full',
	lg: 'w-[300px]',
	md: 'w-[250px]',
	sm: 'w-[150px]',
}

export type ComboBoxProps = {
	label?: string
	description?: string
	options: ComboBoxOption[]
	size?: keyof typeof SIZE_VARIANTS | null
	/** Classes applied to the trigger button for the combobox */
	triggerClassName?: string
	triggerRef?: React.LegacyRef<HTMLDivElement> | undefined
	wrapperClassName?: string
	wrapperStyle?: React.CSSProperties
	placeholder?: string
	filterable?: boolean
	filterPlaceholder?: string
	filterEmptyMessage?: string
} & (SingleSelectComboBoxProps | MultiSelectComboBoxProps)

export function ComboBox({
	label,
	description,
	isMultiSelect,
	options,
	value,
	onChange,
	size = 'default',
	triggerClassName,
	triggerRef,
	wrapperClassName,
	wrapperStyle,
	placeholder = 'Select...',
	filterable = false,
	filterPlaceholder = 'Filter...',
	filterEmptyMessage = 'No results found',
}: ComboBoxProps) {
	const [open, setOpen] = useState(false)

	const handleChange = (selected: string) => {
		if (isMultiSelect) {
			if (value?.includes(selected)) {
				onChange?.(value.filter((item) => item !== selected))
			} else if (value) {
				onChange?.([...value, selected])
			} else {
				onChange?.([selected])
			}
		} else {
			onChange?.(selected)
			setOpen(false)
		}
	}

	const renderSelected = () => {
		if (!value) {
			return placeholder
		}

		if (isMultiSelect) {
			return (
				value
					?.map((selected) => {
						const option = options.find((option) => option.value === selected)
						return option?.label
					})
					.join(', ') || placeholder
			)
		} else {
			return options.find((option) => option.value === value)?.label || placeholder
		}
	}

	const hasSelectedSomething = isMultiSelect ? !!value?.length : !!value
	const Container = label || description ? 'div' : Fragment
	const containerProps = {
		...((label || description) && { className: 'flex flex-col gap-2' }),
	}

	return (
		<Container {...containerProps}>
			{label && <Label>{label}</Label>}
			<Popover open={open} onOpenChange={setOpen}>
				<Popover.Trigger asChild>
					<Button
						// @ts-expect-error: wrong type for ref, but it's fineeee
						ref={triggerRef}
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className={cn(
							'h-[unset] justify-between truncate hover:bg-gray-50/50 data-[state=open]:bg-transparent data-[state=open]:ring-2 data-[state=open]:ring-brand-400 data-[state=open]:ring-offset-2 dark:hover:bg-gray-900/50 dark:data-[state=open]:bg-transparent dark:data-[state=open]:ring-offset-gray-900',
							{ [SIZE_VARIANTS[size || 'default']]: !!size },
							{ 'text-gray-400 dark:text-gray-300': !hasSelectedSomething },
							triggerClassName,
						)}
					>
						{renderSelected()}
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</Popover.Trigger>
				<Popover.Content
					className={cn(
						{ [SIZE_VARIANTS[size || 'default']]: !!size },
						'mt-1 p-0',
						wrapperClassName,
					)}
					style={wrapperStyle}
				>
					<Command>
						{filterable && (
							<>
								<Command.Input placeholder={filterPlaceholder} />
								<Command.Empty>{filterEmptyMessage}</Command.Empty>
							</>
						)}
						<Command.Group>
							{options.map((option) => {
								const isSelected = value?.includes(option.value) || false

								return (
									<Command.Item
										key={option.value}
										onSelect={handleChange}
										className={cn('transition-all duration-75', { 'text-brand': isSelected })}
										value={option.value}
									>
										<Check
											className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
										/>
										{option.label}
									</Command.Item>
								)
							})}
						</Command.Group>
					</Command>
				</Popover.Content>
			</Popover>
			{description && (
				<Text size="sm" variant="muted">
					{description}
				</Text>
			)}
		</Container>
	)
}
