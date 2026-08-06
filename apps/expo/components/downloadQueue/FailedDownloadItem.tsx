import { AlertCircle, RefreshCw, X } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { downloadQueueMetadata } from '~/db'
import { useDownloadQueue, useTranslate } from '~/lib/hooks'

import { Card, Icon, Text } from '../ui'

type Props = {
	item: ReturnType<typeof useDownloadQueue>['failedItems'][number]
	onRetry: (id: number) => void
	onDismiss: (id: number) => void
}

export default function FailedDownloadItem({ item, onRetry, onDismiss }: Props) {
	const { t } = useTranslate()
	return (
		<Card.Row>
			<Icon as={AlertCircle} size={20} className="text-fill-danger" />
			<View className="gap-0.5 flex-1">
				<Text className="font-medium" numberOfLines={1}>
					{downloadQueueMetadata.safeParse(item.metadata).data?.bookName || item.filename}
				</Text>
				<Text className="text-fill-danger" numberOfLines={3}>
					{item.failureReason || t('errors.unknown')}
				</Text>
			</View>

			<View className="gap-1 flex-row">
				<Pressable
					onPress={() => onRetry(item.id)}
					className="bg-white/75 p-2 dark:bg-black/40 rounded-full active:opacity-70"
				>
					<Icon as={RefreshCw} size={16} className="text-foreground-muted" />
				</Pressable>
				<Pressable
					onPress={() => onDismiss(item.id)}
					className="bg-white/75 p-2 dark:bg-black/40 rounded-full active:opacity-70"
				>
					<Icon as={X} size={16} className="text-foreground-muted" />
				</Pressable>
			</View>
		</Card.Row>
	)
}
