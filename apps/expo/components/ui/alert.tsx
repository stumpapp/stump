import type { LucideIcon } from 'lucide-react-native'
import * as React from 'react'
import { View } from 'react-native'

import { Icon } from '~/components/ui/icon'
import { Text, TextClassContext } from '~/components/ui/text'
import { cn } from '~/lib/utils'

// TODO: yoinked from https://reactnativereusables.com/docs/components/alert
// it looks stinky still, should put more consideration into it + more color variants
// i did the bare minimum to get it _closer_ to cards

function Alert({
	className,
	variant,
	children,
	icon,
	iconClassName,
	...props
}: React.ComponentProps<typeof View> &
	React.RefAttributes<View> & {
		icon: LucideIcon
		variant?: 'default' | 'destructive'
		iconClassName?: string
	}) {
	return (
		<TextClassContext.Provider
			value={cn(
				'text-sm text-foreground',
				variant === 'destructive' && 'text-destructive',
				className,
			)}
		>
			<View
				role="alert"
				className={cn(
					'squircle ios:rounded-[2rem] bg-black/5 dark:bg-white/10 px-4 py-3.5 tablet:py-5 flex overflow-hidden rounded-3xl',
					className,
				)}
				{...props}
			>
				<View className="left-3.5 top-5 absolute">
					<Icon
						as={icon}
						className={cn(
							'w-5 h-5 mt-0.5',
							variant === 'destructive' && 'text-destructive',
							iconClassName,
						)}
					/>
				</View>
				{children}
			</View>
		</TextClassContext.Provider>
	)
}

function AlertTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
	return (
		<Text
			className={cn(
				'mb-1 ml-0.5 pl-6 font-medium tracking-tight text-base leading-none',
				className,
			)}
			{...props}
		/>
	)
}

function AlertDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
	const textClass = React.useContext(TextClassContext)
	return (
		<Text
			className={cn(
				'ml-0.5 pb-1.5 pl-6 text-sm leading-relaxed text-foreground-muted',
				textClass?.includes('text-destructive') && 'text-destructive/90',
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
