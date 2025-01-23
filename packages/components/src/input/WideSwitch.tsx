import { Text } from '../text'
import { cn } from '../utils'
import { RawSwitch, RawSwitchProps } from './raw'

export type WideSwitchProps = {
	formId?: string
	label: string
	description: string
	title?: string
} & RawSwitchProps

export function WideSwitch({
	formId,
	label,
	description,
	disabled,
	title,
	...props
}: WideSwitchProps) {
	return (
		<label htmlFor={formId} className="flex items-center justify-between" title={title}>
			<div className="flex flex-grow flex-col gap-2 text-left">
				<Text
					size="sm"
					variant="label"
					className={cn({ 'cursor-not-allowed select-none text-foreground-muted': disabled })}
				>
					{label}
				</Text>
				<Text
					size="sm"
					variant="muted"
					className={cn('max-w-[80%]', {
						'cursor-not-allowed select-none text-foreground-muted': disabled,
					})}
				>
					{description}
				</Text>
			</div>

			<div className="w-6" />

			<RawSwitch id={formId} primaryRing variant="primary" disabled={disabled} {...props} />
		</label>
	)
}
