import React from 'react'

import { Label } from '../label/Label'
import { cn } from '../utils'

// TODO: variant that changes ring color to primary...

// FIXME: https://github.com/jsx-eslint/eslint-plugin-react/issues/3284
export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
	id?: string
	className?: string
	htmlFor?: string
	label?: string
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
	({ className, ...props }, ref) => {
		const Component = (
			<textarea
				className={cn(
					'flex h-20 w-full rounded-md border border-gray-300 bg-transparent py-2 px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-50 dark:focus:ring-gray-400 dark:focus:ring-offset-gray-900',
					className,
				)}
				ref={ref}
				{...props}
			/>
		)

		if (props.label) {
			return (
				<div className="grid items-center gap-1.5">
					<Label htmlFor={props.htmlFor || props.id}>Email</Label>
					{Component}
				</div>
			)
		}

		return Component
	},
)
TextArea.displayName = 'TextArea'

export { TextArea }
