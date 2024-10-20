import { Label } from '../form'
import { cn } from '../utils'
import { RawSwitch, RawSwitchProps, RawSwitchRef } from './raw'

// TODO: orientations (horizontal, vertical)

export type SwitchProps = {
	label: string
	containerClassName?: string
} & RawSwitchProps

export const Switch = React.forwardRef<RawSwitchRef, SwitchProps>(
	({ label, containerClassName, ...props }, ref) => (
		<div className={cn('flex items-center space-x-2', containerClassName)}>
			<RawSwitch {...props} ref={ref} />
			<Label htmlFor={props.id}>{label}</Label>
		</div>
	),
)
Switch.displayName = 'Switch'
