import { CircleAlert, LucideIcon } from 'lucide-react-native'
import React, { ComponentProps } from 'react'
import { Platform, View, ViewProps } from 'react-native'

import { Icon, Text } from '~/components/ui'
import { cn } from '~/lib/utils'

// MARK: Types

type CardProps = ViewProps & {
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

type StatGroupProps = ViewProps

type StatProps = {
	label: string
	value: string | number | undefined | null
	suffix?: string | number | undefined | null
}

// MARK: Card component

/**
 * The Card component. This acts as the container for Card.Row and Card.StatGroup items.
 */
export function Card({
	label,
	description,
	listEmptyStyle,
	children,
	className,
	...props
}: CardProps) {
	const count = React.Children.count(children)

	return (
		<View className={cn('gap-2', className)} {...props}>
			{label && <ListLabel className="ios:px-4 px-2">{label}</ListLabel>}

			{count === 0 ? (
				<ListEmptyMessage {...listEmptyStyle} />
			) : (
				<CardBackground>{children}</CardBackground>
			)}

			{description && (
				<Text size="sm" className="ios:px-4 px-2 text-foreground-muted">
					{description}
				</Text>
			)}
		</View>
	)
}

Card.StatGroup = StatGroup
Card.Stat = Stat
Card.Row = Row

// MARK: Child components

/**
 * The StatGroup component. This acts as the container for Card.Stat items.
 */
function StatGroup({ children, className }: StatGroupProps) {
	return (
		// We shift up by 1px to hide the first divider in a list
		<View className="-mt-[1px]">
			<Divider />

			<View
				className={cn(
					'ios:p-4 flex-row flex-wrap items-start justify-evenly gap-x-1 gap-y-4 p-3',
					className,
				)}
			>
				{children}
			</View>
		</View>
	)
}

function Stat({ label, value, suffix }: StatProps) {
	return (
		<View className="items-center justify-center">
			<Text className="mb-1 text-center font-medium text-foreground-muted">{label}</Text>
			<View className="flex-row items-end gap-0">
				<Text size="xl" className="text-center font-semibold">
					{value}
				</Text>
				{suffix != null && (
					<Text size="xs" className="py-1 text-center text-foreground-muted">
						{suffix}
					</Text>
				)}
			</View>
		</View>
	)
}

function Row({ label, icon, disabled, children, className, ...props }: RowProps) {
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
					<View className="shrink flex-row items-center justify-center gap-4">
						{icon && (
							<View className="squircle flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/75 dark:bg-black/40">
								<Icon as={icon} className="h-6 w-6 text-foreground-muted" />
							</View>
						)}
						<Text className="shrink text-lg">{label}</Text>
					</View>
				)}
				{children}
			</View>
		</View>
	)
}

// MARK: Internal components

function CardBackground({ className, ...props }: ViewProps) {
	return (
		<View
			className={cn(
				// We hide the overflow so that the first divider gets hidden
				'squircle ios:rounded-[2rem] flex overflow-hidden rounded-3xl bg-black/5 dark:bg-white/10',
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
				'ios:mx-4 mx-2 h-px bg-black/10 dark:bg-white/10',
				// gap between icon and text (gap-4) + icon width (w-8) + initial ios padding (ml-4)
				hasIcon && 'ios:ml-16',
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

// MARK: Shared components

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

export function ListLabel({ className, ...props }: ComponentProps<typeof Text>) {
	return (
		<Text className={cn('text-lg font-semibold text-foreground-muted', className)} {...props} />
	)
}
