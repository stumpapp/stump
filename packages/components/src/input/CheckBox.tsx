import React from 'react'

import { type RawCheckBoxRef, RawCheckBox, RawCheckBoxProps } from './raw'

// TODO: Color variants

export type CheckBoxProps = {
	/** The optional label for the checkbox. */
	label?: string
	/** The optional description for the checkbox. */
	description?: string
} & RawCheckBoxProps

export const CheckBox = React.forwardRef<RawCheckBoxRef, CheckBoxProps>(
	({ label, description, ...props }, ref) => {
		const renderContent = () => {
			if (!label && !description) {
				return null
			}

			return (
				<div className="grid gap-1.5 leading-none">
					{label && (
						<label
							htmlFor={props.id}
							className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							{label}
						</label>
					)}
					{description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
				</div>
			)
		}

		return (
			<div className="flex items-start space-x-2">
				<RawCheckBox ref={ref} {...props} />
				{renderContent()}
			</div>
		)
	},
)
CheckBox.displayName = 'CheckBox'
