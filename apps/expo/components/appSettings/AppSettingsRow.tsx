import { BadgeQuestionMark, LucideIcon } from 'lucide-react-native'
import { forwardRef, Fragment } from 'react'
import { Platform, Pressable, View } from 'react-native'

import { cn } from '~/lib/utils'

import { Text } from '../ui'
import { Icon } from '../ui/icon'

type Props = {
	icon: LucideIcon
	title: string
	onPress?: () => void
	divide?: boolean
	isLink?: boolean
} & React.ComponentProps<typeof View>

// TODO: break up into a few variants, e.g. an internal link to another screen vs a
// link to website vs action etc

const AppSettingsRow = forwardRef<View, Props>(
	({ icon, title, children, className, divide = true, isLink, ...props }, ref) => {
		return (
			<Fragment>
				<Pressable {...props} ref={ref}>
					{({ pressed }) => (
						<View
							className={cn('flex-row items-center justify-between py-3', className)}
							style={{ opacity: pressed && isLink ? 0.7 : 1 }}
						>
							<View className="flex-row items-center gap-4">
								<View className="squircle flex h-8 w-8 items-center justify-center rounded-xl bg-background-surface">
									<Icon as={icon || BadgeQuestionMark} className="h-6 w-6 text-foreground-muted" />
								</View>
								<Text className="text-lg">{title}</Text>
							</View>
							{children}
						</View>
					)}
				</Pressable>

				{divide && <Divider />}
			</Fragment>
		)
	},
)
AppSettingsRow.displayName = 'AppSettingsRow'

export default AppSettingsRow

const Divider = () => (
	<View
		className={cn('h-px w-full bg-edge')}
		style={{
			marginLeft: Platform.OS === 'android' ? 0 : 42,
		}}
	/>
)
