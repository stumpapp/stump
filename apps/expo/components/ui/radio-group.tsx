import * as RadioGroupPrimitive from '@rn-primitives/radio-group'

import { cn } from '~/lib/utils'

function RadioGroup({
	className,
	...props
}: RadioGroupPrimitive.RootProps & React.RefAttributes<RadioGroupPrimitive.RootRef>) {
	return <RadioGroupPrimitive.Root className={cn('gap-3', className)} {...props} />
}

function RadioGroupItem({
	className,
	...props
}: RadioGroupPrimitive.ItemProps & React.RefAttributes<RadioGroupPrimitive.ItemRef>) {
	return (
		<RadioGroupPrimitive.Item
			className={cn(
				'squircle aspect-square h-6 w-6 shrink-0 items-center justify-center rounded-full border border-edge shadow-sm shadow-black/5 dark:bg-background-surface',
				props.disabled && 'opacity-50',
				className,
			)}
			{...props}
		>
			<RadioGroupPrimitive.Indicator className="squircle h-4 w-4 rounded-full bg-fill-brand" />
		</RadioGroupPrimitive.Item>
	)
}

export { RadioGroup, RadioGroupItem }
