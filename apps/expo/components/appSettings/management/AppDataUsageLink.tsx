import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ChevronRight, HardDrive } from 'lucide-react-native'
import { View } from 'react-native'

import { Icon, Text } from '~/components/ui'
import { getAppUsage } from '~/lib/filesystem'
import { formatBytes } from '~/lib/format'
import { useTranslate } from '~/lib/hooks'
import { cn } from '~/lib/utils'

import AppSettingsRow from '../AppSettingsRow'

export default function AppDataUsageLink() {
	const { t } = useTranslate()
	const { data } = useQuery({
		queryKey: ['app-usage'],
		queryFn: getAppUsage,
		staleTime: 1000 * 60 * 5, // 5 minutes
		throwOnError: false,
	})

	const formattedSize = formatBytes(data?.total)

	const router = useRouter()

	return (
		<AppSettingsRow
			icon={HardDrive}
			title={t('settings.management.dataUsage.label')}
			isLink
			onPress={() =>
				router.push({
					pathname: '/(tabs)/settings/usage',
				})
			}
		>
			<View className={cn('gap-2 flex flex-row items-center')}>
				<Text className="text-foreground-muted">{formattedSize}</Text>
				<Icon as={ChevronRight} size={20} className="text-foreground-muted" />
			</View>
		</AppSettingsRow>
	)
}
