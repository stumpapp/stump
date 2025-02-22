import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'

import { icons, Text } from '~/components/ui'
import { getAppUsage } from '~/lib/filesystem'
import { formatBytes } from '~/lib/format'
import { cn } from '~/lib/utils'

import AppSettingsRow from '../AppSettingsRow'

const { ChevronRight } = icons

export default function AppDataUsageLink() {
	const { data } = useQuery(['app-usage'], getAppUsage, {
		suspense: true,
		cacheTime: 1000 * 60 * 5, // 5 minutes
		useErrorBoundary: false,
	})

	const formattedSize = formatBytes(data?.total || 0, 0, 'MB')

	const router = useRouter()

	return (
		<AppSettingsRow icon="HardDrive" title="Data usage">
			<Pressable
				onPress={() =>
					router.push({
						pathname: '/(tabs)/settings/usage',
					})
				}
			>
				{({ pressed }) => (
					<View
						className={cn('flex flex-row items-center gap-2', {
							'opacity-80': pressed,
						})}
					>
						<Text className="text-foreground-muted">{formattedSize}</Text>
						<ChevronRight size={20} className="text-foreground-muted" />
					</View>
				)}
			</Pressable>
		</AppSettingsRow>
	)
}
