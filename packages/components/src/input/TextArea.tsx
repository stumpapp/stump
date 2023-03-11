import React from 'react'

import { Label } from '../label/Label'
import { RawTextArea, RawTextAreaProps, RawTextAreaRef } from './RawTextArea'

// TODO: variant that changes ring color to primary...
// TODO: error state

// FIXME: https://github.com/jsx-eslint/eslint-plugin-react/issues/3284
export type TextAreaProps = {
	id?: string
	label: string
	description?: string
} & RawTextAreaProps

const TextArea = React.forwardRef<RawTextAreaRef, TextAreaProps>(
	({ label, description, ...props }, ref) => {
		return (
			<div className="grid items-center gap-1.5">
				<Label htmlFor={props.id}>{label}</Label>
				<RawTextArea ref={ref} {...props} />
				{description && (
					<p className="text-sm text-slate-500">Your message will be copied to the support team.</p>
				)}
			</div>
		)
	},
)
TextArea.displayName = 'TextArea'

export { TextArea }
