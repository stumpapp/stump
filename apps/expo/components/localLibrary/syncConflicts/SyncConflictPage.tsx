import { SDKContext, useDetachedGraphQL, useSDK } from '@stump/client'
import { graphql } from '@stump/graphql'
import { AlertCircle } from 'lucide-react-native'
import { View } from 'react-native'

import { Alert } from '~/components/ui/alert'
import { imageMeta } from '~/db'
import { useTranslate } from '~/lib/hooks'
import { useServerInstance } from '~/lib/hooks/sync/utils'

import { Button, Text } from '../../ui'
import { getThumbnailPath } from '../utils'
import { BranchSplitSvg } from './BranchSplitSvg'
import { LastCommonSessionCard, RemoteSessionList, SourceSessionCard } from './SessionCards'
import { AcceptedProgressionData, ConflictRecord } from './types'

const conflictViewQuery = graphql(`
	query ReadingSessionConflictView($mediaId: ID!, $branchedSessionId: Int!) {
		readingSessionConflictView(mediaId: $mediaId, branchedSessionId: $branchedSessionId) {
			ancestorSession {
				__typename
				id
				endPage
				endPercentage
				elapsedSeconds
				createdAt
				updatedAt
				readthroughNumber
				endLocator {
					href
					chapterTitle
					locations {
						progression
						totalProgression
					}
				}
			}
			remoteSessions {
				__typename
				id
				endPage
				endPercentage
				elapsedSeconds
				createdAt
				updatedAt
				readthroughNumber
				endLocator {
					href
					chapterTitle
					locations {
						progression
						totalProgression
					}
				}
			}
		}
	}
`)

export type SyncConflictPageProps = {
	record: ConflictRecord
	// we don't want to load query for each page at once so the parent will inform
	// when the page is within acceptable range to kick off the query
	isWithinLoadingRange: boolean
	locallyPersistProgress: (
		bookId: string,
		serverId: string,
		progression: AcceptedProgressionData,
	) => Promise<void>
}

export function SyncConflictPage(props: SyncConflictPageProps) {
	const [sdk, setSDK] = useServerInstance(props.record.downloaded_files.serverId)

	if (!sdk) return null

	return (
		<SDKContext.Provider value={{ sdk, setSDK }}>
			<SyncConflictPageContent {...props} />
		</SDKContext.Provider>
	)
}

function SyncConflictPageContent({ record, isWithinLoadingRange }: SyncConflictPageProps) {
	const branchedSessionId = record.read_progress.lastSyncedSessionId

	const { t } = useTranslate()
	const { sdk } = useSDK()
	const { data, isLoading } = useDetachedGraphQL(
		sdk,
		conflictViewQuery,
		['conflictView', record.downloaded_files.id, branchedSessionId],
		{ mediaId: record.downloaded_files.id, branchedSessionId: branchedSessionId ?? 0 },
		{ enabled: isWithinLoadingRange && branchedSessionId != null },
	)

	const conflictView = data?.readingSessionConflictView
	const ancestorSession = conflictView?.ancestorSession ?? null
	const remoteSessions = conflictView?.remoteSessions ?? []

	const thumbnailPath = getThumbnailPath(record.downloaded_files) ?? undefined
	const thumbnailData = imageMeta.safeParse(record.downloaded_files.thumbnailMeta).data

	const bookName = record.downloaded_files.bookName || record.downloaded_files.filename

	// if first remote session has the same id as ancestor, the ancestor
	// was updated on the server after we branched
	const hasGracePeriodConflict =
		remoteSessions.length > 0 && remoteSessions[0]?.id === ancestorSession?.id

	if (isLoading) return null

	return (
		<View className="px-4 pt-1 pb-2 flex-1" style={{ gap: 0 }}>
			<LastCommonSessionCard
				session={ancestorSession}
				bookName={bookName}
				thumbnailPath={thumbnailPath}
				thumbnailData={thumbnailData}
			/>

			<BranchSplitSvg />

			<View className="px-2 gap-2 flex-1 flex-row">
				<View className="flex-1 justify-start">
					<SourceSessionCard session={record.read_progress} />
				</View>

				<View className="flex-1">
					<RemoteSessionList sessions={remoteSessions} />
				</View>
			</View>

			{hasGracePeriodConflict && (
				<Alert icon={AlertCircle} variant="destructive" className="mt-3">
					<Alert.Title>Grace Period Conflict</Alert.Title>
					<Alert.Description>
						TODO: hasGracePeriodConflict, idk figure out what to say or do here!
					</Alert.Description>
				</Alert>
			)}

			<View className="gap-2 pt-3">
				<View className="gap-2 flex-row">
					<Button className="flex-1" variant="outline" roundness="full" disabled>
						<Text>{t('syncConflicts.acceptSource.local')}</Text>
					</Button>
					<Button className="flex-1" roundness="full" disabled>
						<Text>{t('syncConflicts.acceptSource.remote')}</Text>
					</Button>
				</View>
				<Button className="w-full" variant="outline" roundness="full" disabled>
					<Text>{t('syncConflicts.acceptSource.both')}</Text>
				</Button>
			</View>
		</View>
	)
}
