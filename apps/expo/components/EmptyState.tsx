import { View } from 'react-native'

import { cn } from '~/lib/utils'

import Owl from './Owl'
import { Heading, Text } from './ui'

type Props = {
	title?: string
	message: string
	actions?: React.ReactNode
	extraActionGap?: boolean
	containerStyle?: React.ComponentProps<typeof View>['style']
}

export default function EmptyState({
	title,
	message,
	actions,
	extraActionGap,
	containerStyle,
}: Props) {
	return (
		<View className="gap-6 p-4 h-full flex-1 items-center justify-between" style={containerStyle}>
			<View className="gap-6 flex-1 items-center justify-center">
				<Owl owl="empty" />

				<View className="gap-2 px-4 tablet:max-w-lg">
					{title && (
						<Heading size="lg" className="font-semibold leading-tight text-center">
							{title}
						</Heading>
					)}
					<Text size="lg" className="text-center">
						{message}
					</Text>
				</View>
			</View>

			{actions && (
				<View
					className={cn('gap-3 w-full', {
						'mt-12': extraActionGap,
					})}
				>
					{actions}
				</View>
			)}
		</View>
	)
}
