import { View } from 'react-native'

import { Label, Switch } from '~/components/ui'
import { useReaderStore } from '~/stores'

export default function PublisherStyles() {
	const store = useReaderStore((state) => ({
		allowPublisherStyles: state.globalSettings.allowPublisherStyles,
		setAllowPublisherStyles: state.setGlobalSettings,
	}))

	return (
		<View className="w-full flex-row items-center justify-between px-6">
			<Label
				nativeID="defaultServer"
				onPress={() => {
					store.setAllowPublisherStyles({ allowPublisherStyles: !store.allowPublisherStyles })
				}}
			>
				Publisher styles
			</Label>

			<Switch
				checked={Boolean(store.allowPublisherStyles ?? true)}
				onCheckedChange={() => {
					store.setAllowPublisherStyles({ allowPublisherStyles: !store.allowPublisherStyles })
				}}
				accessibilityLabel="Toggle publisher styles"
				accessibilityState={{ checked: store.allowPublisherStyles }}
			/>
		</View>
	)
}
