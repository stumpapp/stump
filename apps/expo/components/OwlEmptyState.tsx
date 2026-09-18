import { View } from 'react-native'

import Owl, { type OwlType, useOwlHeaderOffset } from './Owl'
import { Heading, Text } from './ui'

type Props = {
	title: string
	description?: string
	owl?: OwlType
}

export function OwlEmptyState({ title, description, owl = 'empty' }: Props) {
	const emptyContainerStyle = useOwlHeaderOffset()

	return (
		<View
			// it seems flex-1 really fucks with the layout within sheets, for some reason
			className="gap-6 p-4 items-center justify-center"
			style={emptyContainerStyle}
		>
			<Owl owl={owl} />

			<View className="gap-2 px-4 tablet:max-w-lg">
				<Heading size="lg" className="font-semibold leading-tight text-center">
					{title}
				</Heading>
				{description && <Text className="text-lg text-center">{description}</Text>}
			</View>
		</View>
	)
}
