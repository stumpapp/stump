import { useRouter } from 'expo-router'
import { ChevronRight, GalleryThumbnails } from 'lucide-react-native'
import { View } from 'react-native'

import { Icon } from '~/components/ui'
import { useTranslate } from '~/lib/hooks'

import AppSettingsRow from '../AppSettingsRow'

export default function ReaderSettingsLink() {
	const { t } = useTranslate()
	const router = useRouter()
	return (
		<AppSettingsRow
			icon={GalleryThumbnails}
			title={t('readerSettings.title')}
			onPress={() => router.push('/settings/reader')}
			isLink
		>
			<View className="gap-2 flex flex-row items-center">
				<Icon as={ChevronRight} size={20} className="text-foreground-muted" />
			</View>
		</AppSettingsRow>
	)
}
