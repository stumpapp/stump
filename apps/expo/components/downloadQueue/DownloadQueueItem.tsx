import upperFirst from 'lodash/upperFirst'
import { X } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { downloadQueueMetadata } from '~/db'
import { useDownloadQueue } from '~/lib/hooks'

import { CardRow, Icon, Progress, Text } from '../ui'

type Props = {
	item: ReturnType<typeof useDownloadQueue>['activeItems'][number]
	onCancel: (id: number) => void
}

export default function DownloadQueueItem({ item, onCancel }: Props) {
	const renderProgress = () => {
		if (item.status === 'downloading' && item.progress) {
			return (
				<>
					<Progress value={item.progress.percentage} className="h-2 flex-1" />
					<Text className="text-xs text-foreground-muted">{item.progress.percentage}%</Text>
				</>
			)
		} else if (item.status === 'downloading') {
			return <Text className="text-xs text-foreground-muted">Starting...</Text>
		} else {
			return (
				<Text className="text-xs text-foreground-muted">
					{upperFirst(item.status.split('-').join(' '))}
				</Text>
			)
		}
	}

	return (
		<CardRow>
			<View className="flex-1 gap-1">
				<Text className="font-medium" numberOfLines={1}>
					{downloadQueueMetadata.safeParse(item.metadata).data?.bookName || item.filename}
				</Text>
				<View className="flex-row items-center gap-2">{renderProgress()}</View>
			</View>

			<Pressable
				onPress={() => onCancel(item.id)}
				className="rounded-full bg-white/75 p-2 active:opacity-70 dark:bg-black/40"
			>
				<Icon as={X} size={16} className="text-foreground-muted" />
			</Pressable>
		</CardRow>
	)
}
