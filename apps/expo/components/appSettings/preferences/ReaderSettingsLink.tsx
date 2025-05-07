import { useRouter } from 'expo-router'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { icons } from '~/components/ui'

import AppSettingsRow from '../AppSettingsRow'

const { ChevronRight } = icons

export default function ReaderSettingsLink() {
	const router = useRouter()
	return (
		<Pressable onPress={() => router.push('/settings/reader')}>
			{({ pressed }) => (
				<AppSettingsRow icon="Settings2" title="Settings" className={pressed ? 'opacity-80' : ''}>
					<View className="flex flex-row items-center gap-2">
						<ChevronRight size={20} className="text-foreground-muted" />
					</View>
				</AppSettingsRow>
			)}
		</Pressable>
	)
}
