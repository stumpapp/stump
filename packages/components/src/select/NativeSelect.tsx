import { forwardRef } from 'react'

import { cn } from '../utils'
import { SelectOption } from './index'

export const SELECT_SIZES = {
	default: 'h-9 py-1',
	lg: 'h-10 py-1',
	sm: 'h-8',
	xs: 'h-7',
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
						'appearance-none bg-input/30 focus:bg-input/30 enabled:hover:bg-input/50',
						'border border-border',
						'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
						'text-sm text-foreground selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground',
						'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
						'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
					],
					'px-3 pl-3 pr-8 min-w-0 flex w-full items-center justify-between rounded-interactive transition-colors select-none',
					{
						[SELECT_SIZES[size ?? 'default']]: size,
					},
					{
						'text-muted-foreground': !!emptyOption && props.value === emptyOption.value,
					},
					className,
				)}
				{...props}
				data-testid={props.id}
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
