import { Text } from '../text'
import { cn } from '../utils'
import { RawSwitch, RawSwitchProps } from './raw'

export type WideSwitchProps = {
	formId?: string
	label: string
	description?: string
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
			<div className="gap-2 flex grow flex-col text-left">
				<Text
					size="sm"
					variant="label"
					className={cn({ 'cursor-not-allowed text-foreground-muted select-none': disabled })}
				>
					{label}
				</Text>
				<Text
					size="sm"
					variant="muted"
					className={cn('max-w-[80%]', {
						'cursor-not-allowed text-foreground-muted select-none': disabled,
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
