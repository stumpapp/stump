/* eslint-disable react/prop-types */
import React from 'react'

import { cn } from '../../utils'

export type RawInputProps = React.InputHTMLAttributes<HTMLInputElement>

// TODO: size variants?

export const RawInput = React.forwardRef<HTMLInputElement, RawInputProps>(
	({ className, ...props }, ref) => {
		return (
			<input
				className={cn(
					'flex h-10 w-full rounded-md border border-gray-300 bg-transparent py-2 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-50 dark:focus:ring-gray-400 dark:focus:ring-offset-gray-900',
					className,
				)}
				ref={ref}
				{...props}
			/>
		)
	},
)
RawInput.displayName = 'RawInput'
