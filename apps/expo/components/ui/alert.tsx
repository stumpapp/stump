import { cva } from 'class-variance-authority'
import type { LucideIcon } from 'lucide-react-native'
import * as React from 'react'
import { View } from 'react-native'

import { Icon } from '~/components/ui/icon'
import { Text, TextClassContext } from '~/components/ui/text'
import { cn } from '~/lib/utils'

// TODO: yoinked from https://reactnativereusables.com/docs/components/alert
// it looks stinky still, should put more consideration into it + more color variants
// i did the bare minimum to get it _closer_ to cards

type AlertVariantClasses = {
	default: string
	destructive: string
	warning: string
}

const alertVariants = cva(
	'squircle ios:rounded-[2rem] p-4 tablet:py-5 flex overflow-hidden rounded-3xl',
	{
		variants: {
			variant: {
				default: 'bg-black/5 dark:bg-white/10',
				destructive: 'bg-fill-danger-secondary',
				warning: 'bg-fill-warning-secondary',
			} satisfies AlertVariantClasses,
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

const alertTextVariants = cva('text-foreground', {
	variants: {
		variant: {
			default: 'text-foreground',
			destructive: 'text-fill-danger',
			warning: 'text-fill-warning',
		} satisfies AlertVariantClasses,
	},
	defaultVariants: {
		variant: 'default',
	},
})

type Props = {
	icon?: LucideIcon
	variant?: 'default' | 'destructive' | 'warning'
	iconClassName?: string
}

function Alert({
	className,
	variant,
	children,
	icon,
	iconClassName,
	...props
}: React.ComponentProps<typeof View> & React.RefAttributes<View> & Props) {
	return (
		<TextClassContext.Provider
			value={alertTextVariants({
				variant,
			})}
		>
			<View role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
				{icon && (
					<View className="left-3.5 top-3 absolute">
						<Icon
							as={icon}
							className={cn('w-6 h-6', alertTextVariants({ variant }), iconClassName)}
						/>
					</View>
				)}
				{children}
			</View>
		</TextClassContext.Provider>
	)
}

function AlertTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
	return (
		<Text
			className={cn('mb-1 ml-1.5 pl-6 font-medium tracking-tight text-lg leading-none', className)}
			{...props}
		/>
	)
}

function AlertDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
	const textClass = React.useContext(TextClassContext)
	const variant = textClass?.includes('danger')
		? 'destructive'
		: textClass?.includes('warning')
			? 'warning'
			: 'default'

	return (
		<Text
			className={cn(
				alertTextVariants({ variant }),
				'ml-1.5 pl-6 text-base leading-relaxed',
				{ 'text-foreground-muted': variant === 'default' },
				className,
			)}
			{...props}
		/>
	)
}

type AlertComponent = typeof Alert & {
	Title: typeof AlertTitle
	Description: typeof AlertDescription
}

const AlertWithSubcomponents = Object.assign(Alert, {
	Title: AlertTitle,
	Description: AlertDescription,
}) as AlertComponent

export { AlertWithSubcomponents as Alert }
