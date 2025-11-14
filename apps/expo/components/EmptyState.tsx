import { View } from 'react-native'

import { cn } from '~/lib/utils'

import Owl from './Owl'
import { Heading, Text } from './ui'

type Props = {
	title?: string
	message: string
	actions?: React.ReactNode
	extraActionGap?: boolean
}

export default function EmptyState({ title, message, actions, extraActionGap }: Props) {
	return (
		<View className="h-full flex-1 items-center justify-between gap-6 p-4">
			<View className="flex-1 items-center justify-center gap-6">
				<Owl owl="empty" />

				<View className="gap-2 px-4 tablet:max-w-lg">
					{title && (
						<Heading size="lg" className="text-center font-semibold leading-tight">
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
					className={cn('w-full gap-3', {
						'mt-12': extraActionGap,
					})}
				>
					{actions}
				</View>
			)}
		</View>
	)
}
