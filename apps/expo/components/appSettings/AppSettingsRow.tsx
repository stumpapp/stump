import { forwardRef } from 'react'
import { Pressable, View } from 'react-native'

import { icons } from '~/components/ui'
import { cn } from '~/lib/utils'

import { Text } from '../ui'

type Props = {
	icon: keyof typeof icons
	title: string
	onPress?: () => void
} & React.ComponentProps<typeof View>

// TODO: break up into a few variants, e.g. an internal link to another screen vs a
// link to website vs action etc

const AppSettingsRow = forwardRef<View, Props>(
	({ icon, title, children, className, ...props }, ref) => {
		const Icon = icons[icon]
		return (
			<Pressable
				className={cn('flex-row items-center justify-between py-2', className)}
				{...props}
				ref={ref}
			>
				<View className="flex-row items-center gap-4">
					<View className="flex h-8 w-8 items-center justify-center rounded-xl bg-background-surface">
						<Icon className="text-foreground-muted" size={20} />
					</View>
					<Text className="text-lg">{title}</Text>
				</View>
				{children}
			</Pressable>
		)
	},
)
AppSettingsRow.displayName = 'AppSettingsRow'

export default AppSettingsRow
