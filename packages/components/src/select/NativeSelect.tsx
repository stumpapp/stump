import { forwardRef } from 'react'

import { cn } from '../utils'
import { SelectOption } from './index'

export const SELECT_SIZES = {
	default: 'h-10 py-2',
	lg: 'h-12  py-2',
	sm: 'h-8',
	xs: 'h-6',
}

export type NativeSelectProps = {
	options: SelectOption[]
	value?: string | number
	size?: keyof typeof SELECT_SIZES
	emptyOption?: { label: string; value?: string | number }
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>

// TODO: reuse variants from primitives when created!
// TODO: properly implement this component, lazy rn
export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
	({ options, className, size = 'default', emptyOption, ...props }, ref) => {
		return (
			<select
				ref={ref}
				className={cn(
					[
						'bg-transparent focus:bg-transparent enabled:hover:bg-background-surface',
						'border border-edge-subtle',
						'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-background',
						'text-sm text-foreground-subtle placeholder:text-foreground-muted',
						'disabled:cursor-not-allowed disabled:opacity-50',
					],
					'flex w-full items-center justify-between rounded-md bg-transparent px-3 pl-3 pr-10 transition-all duration-150',
					{
						[SELECT_SIZES[size ?? 'default']]: size,
					},
					{
						'text-foreground-muted': !!emptyOption && props.value === emptyOption.value,
					},
					className,
				)}
				{...props}
			>
				{emptyOption && (
					<option value={emptyOption.value} disabled selected key="native-select-empty-option">
						{emptyOption.label}
					</option>
				)}
				{options.map((option) => (
					<option
						key={option.value || 'null-option'}
						value={option.value}
						disabled={option.disabled}
					>
						{option.label}
					</option>
				))}
			</select>
		)
	},
)
NativeSelect.displayName = 'NativeSelect'
