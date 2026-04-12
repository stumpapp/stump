import { clone, getColor, serialize, set } from 'colorjs.io/fn'
import { CircleAlert, LucideIcon } from 'lucide-react-native'
import React, { ComponentProps, ReactNode, useState } from 'react'
import { Easing, Platform, Pressable, View, ViewProps } from 'react-native'
import { easeGradient } from 'react-native-easing-gradient'
import LinearGradient from 'react-native-linear-gradient'

import { Icon, Text } from '~/components/ui'
import { useColors } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'
import { cn } from '~/lib/utils'
import { usePreferencesStore } from '~/stores'

// MARK: Types

type CardProps = ViewProps & {
	/**
	 * A label displayed above the card (e.g. "Information", "Metadata", "Acknowledgements")
	 */
	label?: string
	/**
	 * An optional arbitrary node to display across from the label
	 */
	actions?: React.ReactNode
	/**
	 * A description displayed under the card
	 */
	description?: string
	/**
	 * Customise the icon and text to display when the list is empty
	 */
	listEmptyStyle?: ListEmptyMessageProps
}

type RowProps = Omit<ViewProps, 'children'> & {
	label?: string
	description?: string
	icon?: LucideIcon
	iconBackgroundColor?: string
	disabled?: boolean
	renderDivider?: boolean
} & ({ value?: string | number; children?: never } | { children?: ReactNode; value?: never })

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
	actions,
	description,
	listEmptyStyle,
	children,
	className,
	...props
}: CardProps) {
	const count = React.Children.count(children)

	const renderHeader = () => {
		if (!label && !actions) return null

		return (
			<View
				className={cn('ios:px-4 gap-4 px-2 flex flex-row items-center justify-between', {
					'justify-end': !label && actions,
				})}
			>
				{label && <ListLabel className="shrink-0">{label}</ListLabel>}
				{actions && <View>{actions}</View>}
			</View>
		)
	}

	return (
		<View className={cn('gap-2', className)} {...props}>
			{renderHeader()}

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
Card.LongRow = LongRow
Card.RowDivider = Divider

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
					'ios:p-4 gap-x-1 gap-y-4 p-3 flex-row flex-wrap items-start justify-evenly',
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
			<Text className="mb-1 font-medium text-center text-foreground-muted">{label}</Text>
			<View className="gap-0 flex-row items-end">
				<Text size="xl" className="font-semibold text-center">
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

function Row({ value, children, ...props }: RowProps) {
	return (
		<BaseRowComponent {...props}>
			{value != undefined && (
				<Text className="text-lg flex-1 text-right text-foreground-muted">{value}</Text>
			)}
			{children}
		</BaseRowComponent>
	)
}

function LongRow({ value, className, ...props }: Omit<RowProps, 'children'>) {
	const colors = useColors()
	const { isDarkColorScheme } = useColorScheme()
	const accentColor = usePreferencesStore((state) => state.accentColor)

	const [expanded, setExpanded] = useState(false)
	const [isExpandable, setIsExpandable] = useState(false)

	const gradient = easeGradient({
		colorStops: {
			0.4: { color: isDarkColorScheme ? '#1A1A1A00' : '#F2F2F100' },
			1: { color: isDarkColorScheme ? '#1A1A1A' : '#F2F2F1' },
		},
		easing: Easing.bezier(0.45, 0, 0.55, 1),
	})

	return (
		<BaseRowComponent
			onPress={() => setExpanded(!expanded)}
			className={cn('gap-1 flex-wrap', className)}
			{...props}
		>
			{value != undefined && (
				<View className="shrink items-end justify-center">
					<Text
						numberOfLines={expanded ? undefined : 4}
						className="text-lg text-foreground-muted"
						onTextLayout={(e) => {
							const isOverLimit = e.nativeEvent.lines.length >= 4
							if (isExpandable === isOverLimit) return
							setIsExpandable(isOverLimit)
						}}
					>
						{value}
					</Text>

					{isExpandable && !expanded && (
						<LinearGradient
							colors={gradient.colors}
							locations={gradient.locations}
							useAngle
							angle={172}
							style={{ position: 'absolute', inset: 0 }}
						/>
					)}

					{isExpandable && (
						<Text
							style={{ color: accentColor || colors.fill.brand.DEFAULT }}
							className={cn('px-1 font-medium', !expanded && 'bottom-0 right-0 absolute')}
						>
							{!expanded ? 'See more' : 'See less'}
						</Text>
					)}
				</View>
			)}
		</BaseRowComponent>
	)
}

// MARK: Internal components

function CardBackground({ className, ...props }: ViewProps) {
	return (
		<View
			className={cn(
				// We hide the overflow so that the first divider gets hidden
				'squircle ios:rounded-[2rem] rounded-3xl bg-black/5 dark:bg-white/10 flex overflow-hidden',
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
				'ios:mx-4 mx-2 bg-black/10 dark:bg-white/10 h-px',
				// gap between icon and text (gap-4) + icon width (w-8) + initial ios padding (ml-4)
				hasIcon && 'ios:ml-16',
				className,
			)}
			{...props}
		/>
	)
}

function BaseRowComponent({
	label,
	description,
	icon,
	iconBackgroundColor,
	renderDivider = true,
	children,
	className,
	onPress,
	disabled,
	...props
}: RowProps & {
	onPress?: () => void
}) {
	const Container = onPress ? Pressable : View
	return (
		// We shift up by 1px to hide the first divider in a list
		<View className="-mt-[1px]">
			{renderDivider && <Divider hasIcon={!!icon} />}

			<Container
				onPress={onPress}
				disabled={disabled}
				className={cn(
					'gap-x-4 px-4 py-3.5 tablet:py-5 flex flex-row items-center justify-between',
					disabled && 'pointer-events-none opacity-50',
					className,
				)}
				{...props}
			>
				{label && (
					<View className="gap-4 shrink flex-row items-center justify-center">
						{icon && <GradientIcon icon={icon} backgroundColor={iconBackgroundColor} />}
						<View className="gap-0.5 shrink">
							<Text className="text-lg shrink">{label}</Text>
							{description && (
								<Text size="sm" className="text-foreground-muted">
									{description}
								</Text>
							)}
						</View>
					</View>
				)}
				{children}
			</Container>
		</View>
	)
}

function GradientIcon({ icon, backgroundColor }: { icon: LucideIcon; backgroundColor?: string }) {
	const { isDarkColorScheme } = useColorScheme()

	const lightPlainColor = getColor(backgroundColor || '#404040')
	const darkPlainColor = clone(lightPlainColor)
	set(lightPlainColor, {
		'oklch.l': (l) => l + (isDarkColorScheme ? 0.1 : 0.18),
		'oklch.c': (c) => c * (isDarkColorScheme ? 1 : 1.2),
	})
	set(darkPlainColor, {
		'oklch.l': (l) => l + (isDarkColorScheme ? -0.1 : 0.05),
		'oklch.c': (c) => c * (isDarkColorScheme ? 1 : 1.2),
	})

	const lightColor = serialize(lightPlainColor, { format: 'hex' })
	const darkColor = serialize(darkPlainColor, { format: 'hex' })

	const gradient = easeGradient({
		colorStops: {
			0: { color: lightColor },
			1: { color: darkColor },
		},
		easing: Easing.bezier(0.42, 0, 0.58, 1),
	})

	return (
		<View className="squircle h-8 w-8 rounded-xl flex shrink-0 items-center justify-center">
			<LinearGradient
				{...gradient}
				useAngle
				angle={195}
				style={{ position: 'absolute', inset: 0 }}
			/>
			<Icon as={icon} size={18} strokeWidth={1.8} absoluteStrokeWidth color="white" />
			<View className="inset-0 rounded-xl dark:border-white/10 border-white/30 squircle absolute border-[0.75px]" />
		</View>
	)
}

// MARK: Shared components

type ListEmptyMessageProps = {
	icon?: LucideIcon
	message?: string
}

export const ListEmptyMessage = ({ icon, message }: ListEmptyMessageProps) => (
	<View
		className={cn(
			'squircle h-24 gap-2 rounded-3xl p-3 w-full items-center justify-center border border-dashed border-edge',
			Platform.OS === 'android' && 'rounded-2xl',
		)}
	>
		<View className="relative flex items-center justify-center">
			<View className="squircle rounded-lg p-2 flex items-center justify-center bg-background-surface">
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
