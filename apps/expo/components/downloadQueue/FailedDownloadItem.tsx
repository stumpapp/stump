import { AlertCircle, RefreshCw, X } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { downloadQueueMetadata } from '~/db'
import { useDownloadQueue } from '~/lib/hooks'

import { CardRow, Icon, Text } from '../ui'

type Props = {
	item: ReturnType<typeof useDownloadQueue>['failedItems'][number]
	onRetry: (id: number) => void
	onDismiss: (id: number) => void
}

export default function FailedDownloadItem({ item, onRetry, onDismiss }: Props) {
	return (
		<CardRow>
			<Icon as={AlertCircle} size={20} className="text-fill-danger" />
			<View className="flex-1 gap-0.5">
				<Text className="font-medium" numberOfLines={1}>
					{downloadQueueMetadata.safeParse(item.metadata).data?.bookName || item.filename}
				</Text>
				<Text className="text-fill-danger" numberOfLines={3}>
					{item.failureReason || 'Unknown error'}
				</Text>
			</View>

			<View className="flex-row gap-1">
				<Pressable
					onPress={() => onRetry(item.id)}
					className="rounded-full bg-white/75 p-2 active:opacity-70 dark:bg-black/40"
				>
					<Icon as={RefreshCw} size={16} className="text-foreground-muted" />
				</Pressable>
				<Pressable
					onPress={() => onDismiss(item.id)}
					className="rounded-full bg-white/75 p-2 active:opacity-70 dark:bg-black/40"
				>
					<Icon as={X} size={16} className="text-foreground-muted" />
				</Pressable>
			</View>
		</CardRow>
	)
}
