import { LucideIcon } from 'lucide-react-native'
import { forwardRef } from 'react'
import { Pressable, View } from 'react-native'

import { CardRow } from '../ui'

type Props = {
	icon: LucideIcon
	title: string
	disabled?: boolean
	onPress?: () => void
	isLink?: boolean
} & React.ComponentProps<typeof View>

// TODO: break up into a few variants, e.g. an internal link to another screen vs a
// link to website vs action etc

const AppSettingsRow = forwardRef<View, Props>(
	({ icon, title, disabled, children, isLink, ...props }, ref) => {
		return (
			<Pressable {...props} ref={ref}>
				{({ pressed }) => (
					<CardRow
						icon={icon}
						label={title}
						style={pressed && isLink && { opacity: 0.7 }}
						disabled={disabled}
					>
						{children}
					</CardRow>
				)}
			</Pressable>
		)
	},
)
AppSettingsRow.displayName = 'AppSettingsRow'

export default AppSettingsRow
