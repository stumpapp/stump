import { Check, ChevronsUpDown } from 'lucide-react'
import {
	Fragment,
	MutableRefObject,
	RefCallback,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react'

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
	fontClassName?: string
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
	default: 'w-50',
	full: 'w-full',
	lg: 'w-75',
	md: 'w-62.5',
	sm: 'w-37.5',
}

const TRIGGER_SIZE_VARIANTS = {
	default: 'h-9 px-3 py-2',
	full: 'h-9 px-3 py-2',
	lg: 'h-10 px-4 py-2',
	md: 'h-9 px-3 py-2',
	sm: 'h-8 px-2.5 py-1.5',
}

export type ComboBoxProps = {
	label?: string
	description?: string
	descriptionPosition?: 'top' | 'bottom'
	options: ComboBoxOption[]
	size?: keyof typeof SIZE_VARIANTS | null
	onAddOption?: (option: ComboBoxOption) => void
	disabled?: boolean
	/** Classes applied to the trigger button for the combobox */
	triggerClassName?: string
	triggerRef?: React.RefObject<HTMLButtonElement>
	wrapperClassName?: string
	wrapperStyle?: React.CSSProperties
	placeholder?: string
	filterable?: boolean
	filterPlaceholder?: string
	filterEmptyMessage?: string
	formatValue?: (value: string | string[] | undefined, options: ComboBoxOption[]) => string
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
	disabled,
	onChange,
	onAddOption,
	formatValue,
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
	const [filter, setFilter] = useState('')

	const handleChange = useCallback(
		(selected: string) => {
			// Note: cmdk lowercases the value passed to onSelect
			const originalOption = options.find(
				(option) => option.value.toLowerCase() === selected.toLowerCase(),
			)
			const originalValue = originalOption?.value ?? selected

			if (isMultiSelect) {
				const existingIndex = value?.findIndex(
					(item) => item.toLowerCase() === selected.toLowerCase(),
				)
				if (existingIndex !== undefined && existingIndex >= 0) {
					onChange?.(value!.filter((_, index) => index !== existingIndex))
				} else if (value) {
					onChange?.([...value, originalValue])
				} else {
					onChange?.([originalValue])
				}
				// FIXME: I don't know why I have to do this, something is triggering the popover to close...
				setTimeout(() => setOpen(true))
			} else {
				onChange?.(originalValue)
				setOpen(false)
			}
		},
		[isMultiSelect, value, onChange, options],
	)

	const renderSelected = () => {
		if (!value || (Array.isArray(value) && value.length === 0)) {
			return placeholder
		}

		if (formatValue) {
			return formatValue(value, options)
		}

		if (isMultiSelect) {
			const adjustedValue = Array.isArray(value) ? value : [value]
			return (
				adjustedValue
					.map((selected) => {
						const option = options.find((option) => option.value === selected)
						return option?.label
					})
					.join(', ') || placeholder
			)
		} else {
			return options.find((option) => option.value === value)?.label || placeholder
		}
	}

	const renderEmptyState = () => {
		if (onAddOption && filter) {
			return (
				<div className="px-1 pb-1 overflow-hidden">
					<Button
						variant="ghost"
						className="px-3 py-2 text-sm font-normal h-auto w-full justify-start rounded-md break-all whitespace-normal text-foreground hover:bg-accent hover:text-accent-foreground"
						onClick={() => {
							onAddOption({ label: filter, value: filter })
							handleChange(filter)
							setFilter('')
						}}
					>
						Add &quot;{filter}&quot;
					</Button>
				</div>
			)
		} else {
			return filterEmptyMessage
		}
	}

	const hasSelectedSomething = isMultiSelect ? !!value?.length : !!value
	const Container = label || description ? 'div' : Fragment
	const containerProps = {
		...((label || description) && { className: 'flex flex-col gap-2' }),
	}

	/* eslint-disable react-hooks/refs */
	const contentStyle = {
		...(size === 'full'
			? {
					width: triggerRef?.current?.offsetWidth,
				}
			: {}),
		...(wrapperStyle || {}),
	}
	/* eslint-enable react-hooks/refs */

	const topDescription = description && descriptionPosition === 'top'
	const bottomDescription = description && descriptionPosition === 'bottom'

	/**
	 * An effect to ensure that the value is always an array when `isMultiSelect` is true. This
	 * can happen if the user provides their own URL filtering and doesn't properly use bracket
	 * notation for the value
	 */
	useEffect(() => {
		if (!isMultiSelect || value == null) return

		if (!Array.isArray(value)) {
			const target = options.find((option) => option.value === value || option.label === value)
			if (target) {
				onChange?.([target.value])
			}
		}
	}, [isMultiSelect, value, onChange, options])

	return (
		<Container {...containerProps}>
			{label && <Label>{label}</Label>}
			{topDescription && (
				<Text size="sm" variant="muted">
					{description}
				</Text>
			)}
			<Popover open={open} onOpenChange={setOpen}>
				<Popover.Trigger asChild disabled={disabled}>
					<Button
						ref={mergeRefs(triggerRef, triggerRefProps)}
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className={cn(
							'gap-1.5 justify-between rounded-interactive border-border bg-input/30 text-foreground outline-none hover:bg-input/50 data-[state=open]:border-ring data-[state=open]:ring-[3px] data-[state=open]:ring-ring/50',
							{ [TRIGGER_SIZE_VARIANTS[size || 'default']]: !!size },
							{ [SIZE_VARIANTS[size || 'default']]: !!size },
							{ 'text-muted-foreground': !hasSelectedSomething },
							triggerClassName,
							options.find((option) => option.value === value)?.fontClassName,
						)}
					>
						<span className="truncate text-left">{renderSelected()}</span>
						<ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground opacity-50" />
					</Button>
				</Popover.Trigger>
				{/* FIXME: this does NOT scroll right... */}
				<Popover.Content
					sideOffset={6}
					className={cn(
						{ [SIZE_VARIANTS[size || 'default']]: !!size },
						'max-h-96 p-0 z-1000 overflow-hidden',
						wrapperClassName,
					)}
					// eslint-disable-next-line react-hooks/refs
					style={contentStyle}
					portal={false}
				>
					<Command className="p-0 rounded-none bg-transparent text-popover-foreground">
						{filterable && (
							<>
								<Command.Input
									wrapperClassName="m-1 mb-0 h-9 rounded-interactive bg-input/30 px-3"
									iconClassName="mr-0 order-last"
									className="h-9 py-2"
									placeholder={filterPlaceholder}
									value={filter}
									onValueChange={setFilter}
								/>
								<Command.Empty>{renderEmptyState()}</Command.Empty>
							</>
						)}
						<Command.List className="scroll-py-1 p-1 data-[empty=true]:p-0 max-h-[min(calc(18rem-2.25rem),calc(100dvh-2.25rem))] overflow-y-auto overscroll-contain">
							<Command.Group className="p-0">
								{options.map((option) => {
									const isSelected = isMultiSelect
										? value?.includes(option.value)
										: value === option.value

									return (
										<Command.Item
											key={option.value}
											// Note: For some reason, this transforms the `value` to lowercase...
											onSelect={handleChange}
											className={cn(
												'gap-2.5 py-2 pr-8 pl-3 relative w-full rounded-sm transition-all duration-75',
												{ 'text-primary': isSelected },
												option.fontClassName,
											)}
											value={option.value}
											keywords={[option.label]}
										>
											<Check
												className={cn(
													'mr-2 h-4 w-4 shrink-0',
													isSelected ? 'opacity-100' : 'opacity-0',
												)}
											/>
											{option.label}
										</Command.Item>
									)
								})}
							</Command.Group>
						</Command.List>
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
