import { LucideIcon } from 'lucide-react-native'
import { View, ViewProps } from 'react-native'

import { StatColorPalette } from '~/lib/constants'
import { useColorScheme } from '~/lib/useColorScheme'

import { Icon, Text } from '../ui'

export type StatCardProps = {
	label: string
	value: string | number
	suffix?: string
	icon: LucideIcon
	colors: StatColorPalette
} & ViewProps

type IconProps = { icon: LucideIcon; colors: StatColorPalette }

export function StatCard({ label, value, suffix, icon, colors, style, ...props }: StatCardProps) {
	const { isDarkColorScheme } = useColorScheme()

	const textColor = isDarkColorScheme ? colors.secondary : colors.primary
	const backgroundColor = isDarkColorScheme ? colors.primary + '80' : colors.secondary + 'c0'

	return (
		<View
			className="squircle gap-2 p-3 rounded-3xl"
			style={[{ backgroundColor: backgroundColor }, style]}
			{...props}
		>
			<View className="flex-row justify-between">
				<IconWithBackground icon={icon} colors={colors} />

				<View className="flex-row items-end">
					<Text size="2xl" className="font-extrabold" style={{ color: textColor }}>
						{value}
					</Text>
					{suffix && (
						<Text size="sm" className="font-bold mb-1 opacity-60" style={{ color: textColor }}>
							{' '}
							{suffix}
						</Text>
					)}
				</View>
			</View>
			<Text className="font-medium px-1" style={{ color: textColor }}>
				{label}
			</Text>
		</View>
	)
}

function IconWithBackground({ icon, colors }: IconProps) {
	return (
		<View
			className="squircle h-8 w-8 flex shrink-0 items-center justify-center rounded-xl"
			style={{ backgroundColor: colors.primary }}
		>
			<Icon as={icon} size={18} strokeWidth={1.8} absoluteStrokeWidth color={colors.secondary} />
			<View className="inset-0 dark:border-white/10 border-white/30 squircle absolute rounded-xl border-[0.75px]" />
		</View>
	)
}

export function MiniStatCard({
	value,
	suffix,
	icon,
	colors,
	style,
	...props
}: Omit<StatCardProps, 'label'>) {
	const { isDarkColorScheme } = useColorScheme()

	const textColor = isDarkColorScheme ? colors.secondary : colors.primary
	const backgroundColor = isDarkColorScheme ? colors.primary + '80' : colors.secondary + '80'

	return (
		<View
			className="gap-2 p-1.5 squircle grow rounded-2xl"
			style={[{ backgroundColor: backgroundColor }, style]}
			{...props}
		>
			<View className="gap-0.5 flex-row items-center justify-between">
				<MiniIconWithBackground icon={icon} colors={colors} />

				<View className="grow flex-row items-end justify-center">
					<Text size="xl" className="font-extrabold" style={{ color: textColor }}>
						{value}
					</Text>
					{suffix && (
						<Text size="xs" className="font-bold mb-1 opacity-60" style={{ color: textColor }}>
							{' '}
							{suffix}
						</Text>
					)}
				</View>
			</View>
		</View>
	)
}

function MiniIconWithBackground({ icon, colors }: IconProps) {
	return (
		<View
			className="squircle h-6 w-6 flex shrink-0 items-center justify-center rounded-lg"
			style={{ backgroundColor: colors.primary }}
		>
			<Icon as={icon} size={14} strokeWidth={1.8} absoluteStrokeWidth color={colors.secondary} />
			<View className="inset-0 dark:border-white/10 border-white/30 squircle absolute rounded-lg border-[0.75px]" />
		</View>
	)
}
