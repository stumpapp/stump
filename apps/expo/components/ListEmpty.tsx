import { View } from 'react-native'

import EmptyState from './EmptyState'

type Props = {
	title?: string
	message: string
	actions?: React.ReactNode
}

export default function ListEmpty({ title, message, actions }: Props) {
	return (
		<View className="py-4 flex-1">
			<EmptyState title={title} message={message} actions={actions} extraActionGap />
		</View>
	)
}
