import * as CheckboxPrimitive from '@rn-primitives/checkbox'
import { Check } from 'lucide-react-native'
import { Platform } from 'react-native'

import { Icon } from '~/components/ui/icon'
import { cn } from '~/lib/utils'

const DEFAULT_HIT_SLOP = 24

function Checkbox({
	className,
	checkedClassName,
	indicatorClassName,
	iconClassName,
	...props
}: CheckboxPrimitive.RootProps &
	React.RefAttributes<CheckboxPrimitive.RootRef> & {
		checkedClassName?: string
		indicatorClassName?: string
		iconClassName?: string
	}) {
	return (
		<CheckboxPrimitive.Root
			className={cn(
				'squircle h-6 w-6 shrink-0 rounded-md border border-edge bg-background-surface shadow-sm shadow-black/5',
				Platform.select({
					native: 'overflow-hidden',
				}),
				props.checked && cn('border-fill-brand-secondary', checkedClassName),
				props.disabled && 'opacity-50',
				className,
			)}
			hitSlop={DEFAULT_HIT_SLOP}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				className={cn(
					'squircle h-full w-full items-center justify-center rounded-md bg-fill-brand',
					indicatorClassName,
				)}
			>
				<Icon
					as={Check}
					size={12}
					strokeWidth={3.5}
					className={cn('text-foreground', iconClassName)}
				/>
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	)
}

export { Checkbox }
