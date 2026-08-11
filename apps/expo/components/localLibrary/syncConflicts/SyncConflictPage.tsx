import { SDKContext, useDetachedGraphQL, useSDK } from '@stump/client'
import { graphql } from '@stump/graphql'
import { AlertCircle } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'

import { Alert } from '~/components/ui/alert'
import { imageMeta } from '~/db'
import { useTranslate } from '~/lib/hooks'
import { useServerInstance } from '~/lib/hooks/sync/utils'

import { Button, Text } from '../../ui'
import { getThumbnailPath } from '../utils'
import { BranchSplitSvg } from './BranchSplitSvg'
import { LastCommonSessionCard, RemoteSessionList, SourceSessionCard } from './SessionCards'
import { AcceptedRemoteProgressionData, ConflictRecord } from './types'

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
	onAcceptRemote: (
		bookId: string,
		serverId: string,
		data: AcceptedRemoteProgressionData,
	) => Promise<void>
	onAcceptLocal: (bookId: string, serverId: string, latestRemoteUpdatedAt: string) => Promise<void>
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

function SyncConflictPageContent({
	record,
	isWithinLoadingRange,
	onAcceptRemote,
	onAcceptLocal,
}: SyncConflictPageProps) {
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

	const latestRemote = remoteSessions.at(-1)

	const [isPending, setIsPending] = useState(false)

	// note that this is functionally equivalent in the scenario where we have a grace period conflict,
	// the difference is really only semantics (local because a sequential session) since we are not
	// reordering the entire history from the point of departure
	//
	// TODO: ^ i don't think this is communicated well in ui, like if i download a book, read on remote, read
	// on local, sync, then we satisfy the grace period conflict BUT a push would extend the session since we
	// are STILL WITHIN the grace period. building this out i just took the assumption this will likely only
	// happen in practice when that grace period has lapsed, and so a push would be a new session. this is
	// fairly easy to detect (if sessions exist newer than ancestor) but no time rn so instead i am leaving myself
	// this long note that arguably i could have just made the changes in this time + a lil extra but is fine
	const handleAcceptLocal = async () => {
		setIsPending(true)
		try {
			await onAcceptLocal(
				record.downloaded_files.id,
				record.downloaded_files.serverId,
				latestRemote?.updatedAt ?? new Date().toISOString(),
			)
		} finally {
			setIsPending(false)
		}
	}

	const handleAcceptRemote = async () => {
		if (!latestRemote) return
		setIsPending(true)
		try {
			await onAcceptRemote(record.downloaded_files.id, record.downloaded_files.serverId, {
				page: latestRemote.endPage,
				elapsedSeconds: latestRemote.elapsedSeconds,
				percentageCompleted: latestRemote.endPercentage,
				locator: latestRemote.endLocator,
				sessionId: latestRemote.id,
				sessionUpdatedAt: latestRemote.updatedAt,
			})
		} finally {
			setIsPending(false)
		}
	}

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
					<Alert.Title>{t('syncConflicts.gracePeriodConflict.title')}</Alert.Title>
					<Alert.Description>
						{t('syncConflicts.gracePeriodConflict.description')}
					</Alert.Description>
				</Alert>
			)}

			<View className="gap-2 pt-3">
				<View className="gap-2 flex-row">
					<Button
						className="flex-1"
						variant="outline"
						roundness="full"
						disabled={isPending}
						onPress={handleAcceptLocal}
					>
						<Text>
							{t(
								hasGracePeriodConflict
									? 'syncConflicts.acceptSource.both'
									: 'syncConflicts.acceptSource.local',
							)}
						</Text>
					</Button>

					<Button
						className="flex-1"
						roundness="full"
						disabled={isPending || !latestRemote}
						onPress={handleAcceptRemote}
					>
						<Text>{t('syncConflicts.acceptSource.remote')}</Text>
					</Button>
				</View>
			</View>
		</View>
	)
}
