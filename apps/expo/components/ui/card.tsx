import { CircleAlert, LucideIcon } from 'lucide-react-native'
import React, { Fragment } from 'react'
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
	 * Customise the icon and text to display when the list is empty
	 */
	listEmptyStyle?: ListEmptyMessageProps
}

export function CardList({ label, listEmptyStyle, children, className, ...props }: CardListProps) {
	const items = React.Children.toArray(children).filter((child) => child)

	return (
		<View className={cn('gap-1', className)} {...props}>
			{label && <Text className="px-2 text-lg font-semibold text-foreground-muted">{label}</Text>}
			{items.length === 0 ? (
				<ListEmptyMessage {...listEmptyStyle} />
			) : (
				<Card>
					{items.map((child, index) => (
						<Fragment key={index}>
							{index !== 0 && <CardDivider />}
							{child}
						</Fragment>
					))}
				</Card>
			)}
		</View>
	)
}

const Card = ({ className, ...props }: ViewProps) => {
	return (
		<View
			className={cn(
				'squircle flex',
				Platform.OS === 'ios' ? 'rounded-3xl' : 'rounded-2xl border border-edge',
				IS_IOS_24_PLUS ? 'bg-black/10 dark:bg-white/10' : 'bg-background-surface',
				className,
			)}
			{...props}
		/>
	)
}

const CardDivider = ({ className, ...props }: ViewProps) => {
	return (
		<View
			className={cn(
				'h-px',
				Platform.OS === 'ios' && 'ml-4',
				IS_IOS_24_PLUS ? 'mx-4 bg-black/10 dark:bg-white/10' : 'bg-edge',
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
