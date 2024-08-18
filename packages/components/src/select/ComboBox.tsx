import { Check, ChevronsUpDown } from 'lucide-react'
import { Fragment, MutableRefObject, RefCallback, useRef, useState } from 'react'

import { Button } from '../button'
import { Command } from '../command'
import { Label } from '../form'
import { Popover } from '../popover'
import { Text } from '../text'
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
	descriptionPosition?: 'top' | 'bottom'
	options: ComboBoxOption[]
	size?: keyof typeof SIZE_VARIANTS | null
	/** Classes applied to the trigger button for the combobox */
	triggerClassName?: string
	triggerRef?: React.RefObject<HTMLButtonElement>
	wrapperClassName?: string
	wrapperStyle?: React.CSSProperties
	placeholder?: string
	filterable?: boolean
	filterPlaceholder?: string
	filterEmptyMessage?: string
} & (SingleSelectComboBoxProps | MultiSelectComboBoxProps)

type MutableRefList<T> = Array<RefCallback<T> | MutableRefObject<T> | undefined | null>

function setRef<T>(val: T, ...refs: MutableRefList<T>): void {
	refs.forEach((ref) => {
		if (typeof ref === 'function') {
			ref(val)
		} else if (ref != null) {
			ref.current = val
		}
	})
}

function mergeRefs<T>(...refs: MutableRefList<T>): RefCallback<T> {
	return (val: T) => {
		setRef(val, ...refs)
	}
}

export function ComboBox({
	label,
	description,
	descriptionPosition = 'bottom',
	isMultiSelect,
	options,
	value,
	onChange,
	size = 'default',
	triggerClassName,
	triggerRef: triggerRefProps,
	wrapperClassName,
	wrapperStyle,
	placeholder = 'Select...',
	filterable = false,
	filterPlaceholder = 'Filter...',
	filterEmptyMessage = 'No results found',
}: ComboBoxProps) {
	const triggerRef = useRef<HTMLButtonElement | null>(null)
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

	const contentStyle = {
		...(size === 'full'
			? {
					width: triggerRef?.current?.offsetWidth,
				}
			: {}),
		...(wrapperStyle || {}),
	}

	const topDescription = description && descriptionPosition === 'top'
	const bottomDescription = description && descriptionPosition === 'bottom'

	return (
		<Container {...containerProps}>
			{label && <Label>{label}</Label>}
			{topDescription && (
				<Text size="sm" variant="muted">
					{description}
				</Text>
			)}
			<Popover open={open} onOpenChange={setOpen}>
				<Popover.Trigger asChild>
					<Button
						ref={mergeRefs(triggerRef, triggerRefProps)}
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className={cn(
							'h-[unset] justify-between truncate border-edge-subtle text-foreground-subtle outline-none hover:bg-background-surface data-[state=open]:bg-transparent data-[state=open]:ring-2 data-[state=open]:ring-brand-400 data-[state=open]:ring-offset-2 data-[state=open]:ring-offset-background',
							{ [SIZE_VARIANTS[size || 'default']]: !!size },
							{ 'text-foreground-muted': !hasSelectedSomething },
							triggerClassName,
						)}
					>
						{renderSelected()}
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</Popover.Trigger>
				{/* FIXME: this does NOT scroll right... */}
				<Popover.Content
					className={cn(
						{ [SIZE_VARIANTS[size || 'default']]: !!size },
						'z-[1000] mt-1 max-h-96 overflow-y-auto p-0',
						wrapperClassName,
					)}
					style={contentStyle}
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
			{bottomDescription && (
				<Text size="sm" variant="muted">
					{description}
				</Text>
			)}
		</Container>
	)
}
