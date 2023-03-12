import React from 'react'

import { Label } from '../form'
import { RawSwitch, RawSwitchProps, RawSwitchRef } from './raw'

// TODO: orientations (horizontal, vertical)

export type SwitchProps = {
	label: string
} & RawSwitchProps

export const Switch = React.forwardRef<RawSwitchRef, SwitchProps>(({ label, ...props }, ref) => (
	<div className="flex items-center space-x-2">
		<RawSwitch {...props} ref={ref} />
		<Label htmlFor={props.id}>{label}</Label>
	</div>
))
Switch.displayName = 'Switch'
