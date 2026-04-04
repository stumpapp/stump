import upperFirst from 'lodash/upperFirst'
import { X } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { downloadQueueMetadata } from '~/db'
import { useDownloadQueue, useTranslate } from '~/lib/hooks'

import { Card, Icon, Progress, Text } from '../ui'

type Props = {
	item: ReturnType<typeof useDownloadQueue>['activeItems'][number]
	onCancel: (id: number) => void
}

export default function DownloadQueueItem({ item, onCancel }: Props) {
	const { t } = useTranslate()

	const renderProgress = () => {
		if (item.status === 'downloading' && item.progress) {
			return (
				<>
					<Progress value={item.progress.percentage} className="h-2 flex-1" />
					<Text className="text-xs text-foreground-muted">{item.progress.percentage}%</Text>
				</>
			)
		} else if (item.status === 'downloading') {
			return (
				<Text className="text-xs text-foreground-muted">{t('downloadQueue.downloadStarting')}</Text>
			)
		} else {
			return (
				<Text className="text-xs text-foreground-muted">
					{upperFirst(item.status.split('-').join(' '))}
				</Text>
			)
		}
	}

	return (
		<Card.Row>
			<View className="gap-1 flex-1">
				<Text className="font-medium" numberOfLines={1}>
					{downloadQueueMetadata.safeParse(item.metadata).data?.bookName || item.filename}
				</Text>
				<View className="gap-2 flex-row items-center">{renderProgress()}</View>
			</View>

			<Pressable
				onPress={() => onCancel(item.id)}
				className="bg-white/75 p-2 dark:bg-black/40 rounded-full active:opacity-70"
			>
				<Icon as={X} size={16} className="text-foreground-muted" />
			</Pressable>
		</Card.Row>
	)
}
