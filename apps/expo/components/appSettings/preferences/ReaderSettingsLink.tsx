import { useRouter } from 'expo-router'
import { ChevronRight, Settings2 } from 'lucide-react-native'
import { View } from 'react-native'

import { Icon } from '~/components/ui'

import AppSettingsRow from '../AppSettingsRow'

export default function ReaderSettingsLink() {
	const router = useRouter()
	return (
		<AppSettingsRow
			icon={Settings2}
			title="Settings"
			onPress={() => router.push('/settings/reader')}
			isLink
			divide={false}
		>
			<View className="flex flex-row items-center gap-2">
				<Icon as={ChevronRight} size={20} className="text-foreground-muted" />
			</View>
		</AppSettingsRow>
	)
}
