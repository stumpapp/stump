import { SDKContext, useDetachedGraphQL, useDetachedGraphQLMutation, useSDK } from '@stump/client'
import { graphql } from '@stump/graphql'
import { AlertCircle } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'

import { Alert } from '~/components/ui/alert'
import { imageMeta } from '~/db'
import { useTranslate } from '~/lib/hooks'
import { useServerInstance } from '~/lib/hooks/sync/utils'
import { buildLocalToRemoteProgressInput } from '~/lib/localLibrary'

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

const acceptLocalMutation = graphql(`
	mutation AcceptLocalProgress($id: ID!, $ancestorSessionId: Int, $input: MediaProgressInput!) {
		acceptLocalProgress(id: $id, ancestorSessionId: $ancestorSessionId, input: $input) {
			id
			endPage
			endPercentage
			elapsedSeconds
			updatedAt
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
`)

export type SyncConflictPageProps = {
	record: ConflictRecord
	// we don't want to load query for each page at once so the parent will inform
	// when the page is within acceptable range to kick off the query
	isWithinLoadingRange: boolean
	// will adjust local progression so that it will upsert to remote as continuation
	// of the latest remote session
	onAcceptBoth: (bookId: string, serverId: string, latestRemoteUpdatedAt: string) => Promise<void>
	// will write the provided remote session data to the local and mark it as synced,
	// used for both accept local and remote operations, differing only in that accept local
	// will push before writing the synced back changes
	onApplySyncedSessionData: (
		bookId: string,
		serverId: string,
		data: AcceptedProgressionData,
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

function SyncConflictPageContent({
	record,
	isWithinLoadingRange,
	onAcceptBoth,
	onApplySyncedSessionData,
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

	const hasNoCommonAncestor = ancestorSession == null
	// if first remote session has the same id as ancestor, the ancestor
	// was updated on the server after we branched
	const hasDivergentProgress =
		remoteSessions.length > 0 && remoteSessions[0]?.id === ancestorSession?.id

	const latestRemote = remoteSessions.at(-1)

	const [isPending, setIsPending] = useState(false)

	const { mutate: acceptLocal, isPending: isAcceptingLocal } = useDetachedGraphQLMutation(
		sdk,
		acceptLocalMutation,
		{
			onSuccess: async ({ acceptLocalProgress: progression }) => {
				await onApplySyncedSessionData(
					record.downloaded_files.id,
					record.downloaded_files.serverId,
					{
						page: progression.endPage,
						elapsedSeconds: progression.elapsedSeconds,
						percentageCompleted: progression.endPercentage,
						locator: progression.endLocator,
						sessionId: progression.id,
						sessionUpdatedAt: progression.updatedAt,
					},
				)
			},
		},
	)

	const handleAcceptBoth = async () => {
		setIsPending(true)
		try {
			await onAcceptBoth(
				record.downloaded_files.id,
				record.downloaded_files.serverId,
				latestRemote?.updatedAt ?? new Date().toISOString(),
			)
		} finally {
			setIsPending(false)
		}
	}

	const handleAcceptLocal = () => {
		acceptLocal({
			id: record.downloaded_files.id,
			ancestorSessionId: ancestorSession?.id ?? null,
			input: buildLocalToRemoteProgressInput(record.read_progress),
		})
	}

	const handleAcceptRemote = async () => {
		if (!latestRemote) return
		setIsPending(true)
		try {
			await onApplySyncedSessionData(record.downloaded_files.id, record.downloaded_files.serverId, {
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

	const disableButtons = isAcceptingLocal || isPending

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

			{hasNoCommonAncestor && (
				<Alert icon={AlertCircle} variant="destructive" className="mt-3">
					<Alert.Title>{t('syncConflicts.noCommonReadingHistory.title')}</Alert.Title>
					<Alert.Description>
						{t('syncConflicts.noCommonReadingHistory.description')}
					</Alert.Description>
				</Alert>
			)}

			{hasDivergentProgress && (
				<Alert icon={AlertCircle} variant="destructive" className="mt-3">
					<Alert.Title>{t('syncConflicts.divergentProgress.title')}</Alert.Title>
					<Alert.Description>{t('syncConflicts.divergentProgress.description')}</Alert.Description>
				</Alert>
			)}

			<View className="gap-2 pt-3">
				<View className="gap-2 flex-row">
					<Button
						className="flex-1"
						variant="outline"
						roundness="full"
						disabled={disableButtons}
						onPress={handleAcceptLocal}
					>
						<Text>{t('syncConflicts.acceptSource.local')}</Text>
					</Button>

					<Button
						className="flex-1"
						roundness="full"
						disabled={disableButtons || !latestRemote}
						onPress={handleAcceptRemote}
					>
						<Text>{t('syncConflicts.acceptSource.remote')}</Text>
					</Button>
				</View>

				<Button
					className="w-full"
					variant="outline"
					roundness="full"
					disabled={disableButtons}
					onPress={handleAcceptBoth}
				>
					<Text>{t('syncConflicts.acceptSource.both')}</Text>
				</Button>
			</View>
		</View>
	)
}
