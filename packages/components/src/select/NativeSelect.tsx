import { forwardRef } from 'react'

import { cn } from '../utils'
import { SelectOption } from './index'

export type NativeSelectProps = {
	options: SelectOption[]
	value?: string
} & React.SelectHTMLAttributes<HTMLSelectElement>

// TODO: reuse variants from primitives when created!
// TODO: properly implement this component, lazy rn
export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
	({ options, className, ...props }, ref) => {
		return (
			<select
				ref={ref}
				className={cn(
					'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-transparent px-3 py-2 pl-3 pr-10 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-50 dark:focus:ring-brand-400 dark:focus:ring-offset-gray-900',
					className,
				)}
				{...props}
			>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		)
	},
)
NativeSelect.displayName = 'NativeSelect'
