import { View } from 'react-native'

import { icons } from '~/lib'

import { Text } from './ui'

const { PackageX } = icons

type Props = {
	message?: string
}

export default function Unimplemented({ message = 'This feature is not yet implemented' }: Props) {
	return (
		<View className="squircle m-6 flex-1 items-center justify-center gap-5 rounded-xl border border-dashed border-edge">
			<PackageX className="h-10 w-10 text-foreground-muted" />
			<Text>{message}</Text>
		</View>
	)
}
