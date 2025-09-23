import * as Slot from '@rn-primitives/slot'
import type { SlottableViewProps } from '@rn-primitives/types'
import { cva, type VariantProps } from 'class-variance-authority'
import { View } from 'react-native'

import { TextClassContext } from '~/components/ui/text'
import { cn } from '~/lib/utils'

const badgeVariants = cva(
	'web:inline-flex items-center squircle rounded-lg border border-border px-2.5 py-2 web:transition-colors web:focus:outline-none web:focus:ring-2 web:focus:ring-ring web:focus:ring-offset-2',
	{
		variants: {
			variant: {
				default: 'border-transparent bg-background-surface',
				secondary: 'border-transparent bg-background-surface',
				destructive: 'border-transparent bg-fill-danger',
				brand: 'border-transparent bg-fill-brand',
				outline: 'text-foreground',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

const badgeTextVariants = cva('text-sm font-semibold', {
	variants: {
		variant: {
			brand: 'text-foreground',
			default: 'text-foreground',
			secondary: 'text-foreground',
			destructive: 'text-foreground',
			outline: 'text-foreground',
		},
	},
	defaultVariants: {
		variant: 'default',
	},
})

type BadgeProps = SlottableViewProps & VariantProps<typeof badgeVariants>

function Badge({ className, variant, asChild, ...props }: BadgeProps) {
	const Component = asChild ? Slot.View : View
	return (
		<TextClassContext.Provider value={badgeTextVariants({ variant })}>
			<Component className={cn(badgeVariants({ variant }), className)} {...props} />
		</TextClassContext.Provider>
	)
}

export { Badge, badgeTextVariants, badgeVariants }
export type { BadgeProps }
