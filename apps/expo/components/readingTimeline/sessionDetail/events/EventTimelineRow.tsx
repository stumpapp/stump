import { intlFormat } from 'date-fns'
import { LucideIcon } from 'lucide-react-native'
import { View } from 'react-native'

import { Icon, Text } from '~/components/ui'
import { cn } from '~/lib/utils'

type Props = {
	icon: {
		as: LucideIcon
		shape?: 'circle' | 'rounded'
		color?: string
		// ^ TODO: take in hue, use usePalette?
	}
	timestamp: Date
	children: React.ReactNode
}

export function EventTimelineRow({
	icon: { as: icon, shape = 'circle' },
	timestamp,
	children,
}: Props) {
	// TODO: diff sizes for circle v round, will mess with separator
	return (
		<View className="gap-2.5 flex flex-row items-center">
			<Text>
				{intlFormat(timestamp, {
					hour: 'numeric',
					minute: 'numeric',
				})}
			</Text>

			<View
				className={cn(
					'squircle h-12 w-12 bg-black/5 dark:bg-white/10 flex shrink-0 items-center justify-center rounded-full',
					{
						'rounded-xl': shape === 'rounded',
					},
				)}
			>
				<Icon as={icon} size={18} strokeWidth={1.8} absoluteStrokeWidth />
				<View
					className={cn(
						'inset-0 dark:border-white/10 border-white/30 squircle absolute rounded-full border-[0.75px]',
						{
							'rounded-xl': shape === 'rounded',
						},
					)}
				/>
			</View>

			{children}
		</View>
	)
}
