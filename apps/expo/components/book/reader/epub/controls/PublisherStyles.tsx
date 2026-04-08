import { View } from 'react-native'
import { useShallow } from 'zustand/react/shallow'

import { Switch, Text } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'
import { useReaderStore } from '~/stores'

export default function PublisherStyles() {
	const { t } = useTranslate()
	const store = useReaderStore(
		useShallow((state) => ({
			allowPublisherStyles: state.globalSettings.allowPublisherStyles,
			setAllowPublisherStyles: state.setGlobalSettings,
		})),
	)

	return (
		<View className="px-6 py-4 w-full flex-row items-center justify-between">
			<Text
				nativeID="defaultServer"
				onPress={() => {
					store.setAllowPublisherStyles({ allowPublisherStyles: !store.allowPublisherStyles })
				}}
				className="text-lg"
			>
				{t('epubSettings.publisherStyles')}
			</Text>

			<View>
				<Switch
					checked={Boolean(store.allowPublisherStyles ?? true)}
					onCheckedChange={() => {
						store.setAllowPublisherStyles({ allowPublisherStyles: !store.allowPublisherStyles })
					}}
					accessibilityLabel={t('epubSettings.publisherStyles')}
					accessibilityState={{ checked: store.allowPublisherStyles }}
				/>
			</View>
		</View>
	)
}
