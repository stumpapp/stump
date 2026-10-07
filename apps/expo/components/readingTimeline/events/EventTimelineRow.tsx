import { intlFormat } from 'date-fns'
import { LucideIcon } from 'lucide-react-native'
import { View, ViewProps } from 'react-native'

import { Icon, Text } from '~/components/ui'
import { cn } from '~/lib/utils'

type Props = ViewProps & {
	icon: {
		as: LucideIcon
		shape?: 'circle' | 'rounded'
		color?: string
		// ^ TODO: take in hue, use usePalette?
		size?: 'sm' | 'default'
	}
	timestamp: Date
	children: React.ReactNode
	showTopConnector?: boolean
	showBottomConnector?: boolean
	feedType: 'sessions' | 'events'
}

// TODO: struggling to figure out the ideal way to do the node attach lines, the current problem i see
// is the dynamic spacing (e.g., an annotation spreads out and the line is taller than a bookmark node).
// the min-h sorta helps a little by increasing the size of the smaller ones, but going too much higher
// creates way too much space
export function EventTimelineRow({
	icon: { as: icon, shape = 'circle', size: iconSize = 'default' },
	timestamp,
	children,
	showTopConnector = false,
	showBottomConnector = false,
	feedType,
	...props
}: Props) {
	const isSmall = iconSize === 'sm'

	return (
		<View className="gap-2.5 flex flex-row items-center" {...props}>
			{feedType === 'sessions' && (
				<Text className="py-4">
					{intlFormat(timestamp, {
						hour: 'numeric',
						minute: 'numeric',
					})}
				</Text>
			)}

			{/*the w-12 is fixed so i could center the node attach line*/}
			<View className="w-12 flex flex-col items-center self-stretch">
				<View
					className={cn(
						'w-px flex-1',
						showTopConnector && 'bg-black/10 dark:bg-white/10 min-h-[1.5rem]',
					)}
				/>

				<View
					className={cn(
						'squircle bg-black/5 dark:bg-white/10 h-12 w-12 flex shrink-0 items-center justify-center rounded-full',
						{ 'rounded-xl': shape === 'rounded' },
						{ 'h-9 w-9': isSmall },
					)}
				>
					<Icon as={icon} size={isSmall ? 15 : 18} strokeWidth={1.8} absoluteStrokeWidth />
					<View
						className={cn(
							'inset-0 dark:border-white/10 border-white/30 squircle absolute rounded-full border-[0.75px]',
							{ 'rounded-xl': shape === 'rounded' },
						)}
					/>
				</View>

				<View
					className={cn(
						'w-px flex-1',
						showBottomConnector && 'bg-black/10 dark:bg-white/10 min-h-[1.5rem]',
					)}
				/>
			</View>

			<View className="py-4 flex-1">{children}</View>
		</View>
	)
}
