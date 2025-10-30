import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ChevronRight, HardDrive } from 'lucide-react-native'
import { View } from 'react-native'

import { Icon, Text } from '~/components/ui'
import { getAppUsage } from '~/lib/filesystem'
import { formatBytes } from '~/lib/format'
import { cn } from '~/lib/utils'

import AppSettingsRow from '../AppSettingsRow'

export default function AppDataUsageLink() {
	const { data } = useQuery({
		queryKey: ['app-usage'],
		queryFn: getAppUsage,
		staleTime: 1000 * 60 * 5, // 5 minutes
		throwOnError: false,
	})

	const formattedSize = formatBytes(data?.total || 0, 0, 'MB')

	const router = useRouter()

	return (
		<AppSettingsRow
			icon={HardDrive}
			title="Data usage"
			divide={false}
			isLink
			onPress={() =>
				router.push({
					pathname: '/(tabs)/settings/usage',
				})
			}
		>
			<View className={cn('flex flex-row items-center gap-2')}>
				<Text className="text-foreground-muted">{formattedSize}</Text>
				<Icon as={ChevronRight} size={20} className="text-foreground-muted" />
			</View>
		</AppSettingsRow>
	)
}
