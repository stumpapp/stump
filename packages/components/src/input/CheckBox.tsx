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

// TODO: doesn't work well in form...
// TODO: Wrap checkbox in label if provided
// TODO: fix ring bg color on dark mode
export const CheckBox = React.forwardRef<RawCheckBoxRef, CheckBoxProps>(
	({ label, description, ...props }, ref) => {
		const renderContent = () => {
			if (!label && !description) {
				return null
			}

			return (
				<div className="gap-1.5 grid leading-none">
					{label && (
						<Label
							htmlFor={props.id}
							className={cx({ 'cursor-not-allowed opacity-50': props.disabled })}
						>
							{label}
						</Label>
					)}
					{description && (
						<Text
							size="sm"
							variant="muted"
							className={cx({ 'cursor-not-allowed opacity-50': props.disabled })}
						>
							{description}
						</Text>
					)}
				</div>
			)
		}

		return (
			<div className="space-x-2 flex items-start">
				<RawCheckBox ref={ref} {...props} />
				{renderContent()}
			</div>
		)
	},
)
CheckBox.displayName = 'CheckBox'
