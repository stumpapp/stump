import { CircleAlert, LucideIcon } from 'lucide-react-native'
import React from 'react'
import { Platform, View, ViewProps } from 'react-native'

import { Icon, Text } from '~/components/ui'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { cn } from '~/lib/utils'

type CardListProps = ViewProps & {
	/**
	 * A label displayed above the card (e.g. "Information", "Metadata", "Acknowledgements")
	 */
	label?: string
	/**
	 * A description displayed under the card
	 */
	description?: string
	/**
	 * Customise the icon and text to display when the list is empty
	 */
	listEmptyStyle?: ListEmptyMessageProps
}

type RowProps = ViewProps & {
	label?: string
	icon?: LucideIcon
	disabled?: boolean
}

export function CardList({
	label,
	description,
	listEmptyStyle,
	children,
	className,
	...props
}: CardListProps) {
	const count = React.Children.count(children)

	return (
		<View className={cn('gap-2', className)} {...props}>
			{label && (
				<Text className="ios:px-4 px-2 text-lg font-semibold text-foreground-muted">{label}</Text>
			)}

			{count === 0 ? <ListEmptyMessage {...listEmptyStyle} /> : <Background>{children}</Background>}

			{description && <Text className="ios:px-4 px-2 text-foreground-muted">{description}</Text>}
		</View>
	)
}

export function CardRow({ label, icon, disabled, children, className, ...props }: RowProps) {
	return (
		// We shift up by 1px to hide the first divider in a list
		<View className="-mt-[1px]">
			<Divider hasIcon={!!icon} />

			<View
				className={cn(
					'flex flex-row items-center justify-between gap-x-4 px-4 py-3.5',
					disabled && 'pointer-events-none opacity-50',
					className,
				)}
				{...props}
			>
				{label && (
					<View className="flex-row items-center justify-center gap-4">
						{icon && (
							<View className="squircle flex h-8 w-8 items-center justify-center rounded-xl bg-white/75 dark:bg-black/40">
								<Icon as={icon} className="h-6 w-6 text-foreground-muted" />
							</View>
						)}
						<Text className="text-lg">{label}</Text>
					</View>
				)}
				{children}
			</View>
		</View>
	)
}

function Background({ className, ...props }: ViewProps) {
	return (
		<View
			className={cn(
				// We hide the overflow so that the first divider gets hidden
				'squircle flex overflow-hidden bg-black/5 dark:bg-white/10',
				Platform.OS === 'ios' ? 'rounded-[2rem]' : 'rounded-2xl border border-edge',
				className,
			)}
			{...props}
		/>
	)
}

function Divider({ hasIcon, className, ...props }: { hasIcon?: boolean } & ViewProps) {
	return (
		<View
			className={cn(
				'h-px',
				Platform.OS === 'ios' ? 'ml-4 bg-black/10 dark:bg-white/10' : 'bg-edge',
				IS_IOS_24_PLUS && 'mr-4',
				// gap between icon and text (gap-4) + icon width (w-8) + initial ios padding (ml-4)
				hasIcon && Platform.OS === 'ios' && 'ml-16',
				className,
			)}
			{...props}
		/>
	)
}

type ListEmptyMessageProps = {
	icon?: LucideIcon
	message?: string
}

export const ListEmptyMessage = ({ icon, message }: ListEmptyMessageProps) => (
	<View
		className={cn(
			'squircle h-24 w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-edge p-3',
			Platform.OS === 'android' && 'rounded-2xl',
		)}
	>
		<View className="relative flex items-center justify-center">
			<View className="squircle flex items-center justify-center rounded-lg bg-background-surface p-2">
				<Icon as={icon || CircleAlert} className="h-6 w-6 text-foreground-muted" />
				{/* <Icon as={Slash} className="absolute h-6 w-6 transform text-foreground opacity-80" /> */}
			</View>
		</View>

		<Text>{message || 'Nothing to display'}</Text>
	</View>
)
