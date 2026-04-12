import { LucideIcon } from 'lucide-react-native'
import { View, ViewProps } from 'react-native'

import { Icon, Text } from './ui'

export type StatCardProps = {
	label: string
	value: string | number
	suffix?: string
	icon: LucideIcon
	baseColor: string
} & ViewProps

export function StatCard({ label, value, suffix, icon, baseColor, ...props }: StatCardProps) {
	return (
		<View className="rounded-3xl squircle gap-2 p-3 bg-white/40 dark:bg-transparent" {...props}>
			<View
				className="inset-0 rounded-3xl squircle border-white/20 absolute border-[1.5px] opacity-30"
				style={{ backgroundColor: baseColor }}
			/>

			<View className="flex-row justify-between">
				<IconWithBackground icon={icon} baseColor={baseColor} />

				<View className="flex-row items-end">
					<Text size="2xl" className="font-extrabold" style={{ color: baseColor }}>
						{value}
					</Text>
					{suffix && (
						<Text size="sm" className="font-bold mb-1 opacity-60" style={{ color: baseColor }}>
							{' '}
							{suffix}
						</Text>
					)}
				</View>
			</View>
			<Text className="font-medium px-1" style={{ color: baseColor }}>
				{label}
			</Text>
		</View>
	)
}

function IconWithBackground({ icon, baseColor }: { icon: LucideIcon; baseColor: string }) {
	return (
		<View
			className="squircle h-8 w-8 rounded-xl flex shrink-0 items-center justify-center"
			style={{ backgroundColor: baseColor }}
		>
			<Icon as={icon} size={18} strokeWidth={1.8} absoluteStrokeWidth color="white" />
			<View className="inset-0 rounded-xl dark:border-white/10 border-white/30 squircle absolute border-[0.75px]" />
		</View>
	)
}
