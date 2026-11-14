import { RefreshCw, Trash2 } from 'lucide-react-native'
import { View } from 'react-native'

import { useDownloadQueue, useTranslate } from '~/lib/hooks'

import SheetWithHeader from '../SheetWithHeader'
import { Card } from '../ui'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { Text } from '../ui/text'
import FailedDownloadItem from './FailedDownloadItem'

export const DOWNLOAD_PROBLEMS_SHEET_NAME = 'downloadsProblemsSheet'

type Props = {
	onDismiss?: () => void
}

export function DownloadProblemsSheet({ onDismiss }: Props) {
	const { t } = useTranslate()
	const { failedItems, retry, dismiss, retryAllFailed, dismissAllFailed } = useDownloadQueue()

	return (
		<SheetWithHeader
			name={DOWNLOAD_PROBLEMS_SHEET_NAME}
			detents={['auto', 1]}
			headerLabel={t(getKey('title'))}
			onDidDismiss={onDismiss ? () => onDismiss() : undefined}
		>
			<View className="gap-4">
				{failedItems.length === 0 && (
					<View className="py-8 items-center justify-center">
						<Text className="text-foreground-muted">{t(getKey('noFailedDownloads'))}</Text>
					</View>
				)}

				{failedItems.length > 0 && (
					<>
						<View className="gap-2 flex-row">
							<Button
								variant="outline"
								roundness="full"
								className="gap-2 flex-1 flex-row"
								onPress={retryAllFailed}
							>
								<Icon as={RefreshCw} size={14} />
								<Text>{t(getKey('retryAll'))}</Text>
							</Button>

							<Button
								variant="destructive"
								roundness="full"
								className="gap-2 flex-1 flex-row"
								onPress={dismissAllFailed}
							>
								<Icon as={Trash2} size={14} className="text-white" />
								<Text>{t(getKey('dismissAll'))}</Text>
							</Button>
						</View>

						<Card>
							{failedItems.map((item) => (
								<FailedDownloadItem key={item.id} item={item} onRetry={retry} onDismiss={dismiss} />
							))}
						</Card>
					</>
				)}
			</View>
		</SheetWithHeader>
	)
}

const LOCALE_BASE = 'localLibrary.downloadProblemsSheet'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
