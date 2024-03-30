import React from 'react'

import { Label } from '../form'
import { Text } from '../text'
import { cx } from '../utils'
import { RawCheckBox, RawCheckBoxProps, type RawCheckBoxRef } from './raw'

export type CheckBoxProps = {
	/** The optional label for the checkbox. */
	label?: string
	/** The optional description for the checkbox. */
	description?: string
} & RawCheckBoxProps

// TODO: Wrap checkbox in label if provided
// TODO: fix ring bg color on dark mode
export const CheckBox = React.forwardRef<RawCheckBoxRef, CheckBoxProps>(
	({ label, description, ...props }, ref) => {
		const renderContent = () => {
			if (!label && !description) {
				return null
			}

			return (
				<div className="grid gap-1.5 leading-none">
					{label && (
						<Label
							htmlFor={props.id}
							className={cx({ 'cursor-not-allowed text-opacity-50': props.disabled })}
						>
							{label}
						</Label>
					)}
					{description && (
						<Text
							size="sm"
							variant="muted"
							className={cx({ 'cursor-not-allowed text-opacity-50': props.disabled })}
						>
							{description}
						</Text>
					)}
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
