import { View } from 'react-native'

import EmptyState from './EmptyState'

type Props = {
	title?: string
	message: string
	actions?: React.ReactNode
}

export default function ListEmpty({ title, message, actions }: Props) {
	return (
		<View className="flex-1 py-4">
			<EmptyState title={title} message={message} actions={actions} extraActionGap />
		</View>
	)
}
