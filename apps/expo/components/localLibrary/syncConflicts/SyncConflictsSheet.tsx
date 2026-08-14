import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { parseGraphQLDateTime } from '@stump/client'
import { useMutation } from '@tanstack/react-query'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { db, downloadedFiles, epubProgress, readProgress, syncStatus } from '~/db'
import { useColors } from '~/lib/constants'
import { useProgressSync, useTranslate } from '~/lib/hooks'

import { OwlEmptyState } from '../../OwlEmptyState'
import { SheetBackDetection } from '../../SheetBackDetection'
import { Badge, Heading, Text } from '../../ui'
import { ConflictCarousel } from './ConflictCarousel'
import { AcceptedProgressionData, ConflictRecord } from './types'

export const SYNC_CONFLICTS_SHEET_NAME = 'syncConflictsSheet'

type Props = {
	onDismiss?: () => void
}

export function SyncConflictsSheet({ onDismiss }: Props) {
	const { t } = useTranslate()

	const ref = useRef<TrueSheet | null>(null)
	const colors = useColors()
	const insets = useSafeAreaInsets()

	const [isOpen, setIsOpen] = useState(false)

	const { data: conflictingRecords, updatedAt } = useLiveQuery(
		db
			.select()
			.from(downloadedFiles)
			.leftJoin(readProgress, eq(downloadedFiles.id, readProgress.bookId))
			.where(eq(readProgress.syncStatus, 'CONFLICT')),
	)

	const oldestModifiedAt = useMemo(
		() =>
			conflictingRecords?.reduce(
				(oldest, record) => {
					const modifiedAt = record.read_progress?.lastModified
					if (!modifiedAt) return oldest
					if (!oldest) return modifiedAt
					return modifiedAt < oldest ? modifiedAt : oldest
				},
				null as Date | null,
			),
		[conflictingRecords],
	)

	const { pullProgress, syncProgress } = useProgressSync()

	const {
		mutate: executePullProgress,
		// TODO: loading state to show updating background etc, otherwise might flash
		// stale data after pull finishes
		// isPending: isPullingProgression,
		// error: pullError, TODO: handle me plz
	} = useMutation({
		mutationFn: () => {
			const serverIds = [
				...new Set(conflictingRecords?.map((r) => r.downloaded_files.serverId) ?? []),
			]
			return pullProgress({ forServers: serverIds, suppressAlerts: true })
		},
		throwOnError: false,
	})

	const serverIdsToSyncUponClose = useRef(new Set<string>())

	const shouldPull = useMemo(
		() => !oldestModifiedAt || oldestModifiedAt.getTime() < Date.now() - 5 * 60 * 1000,
		[oldestModifiedAt],
	)

	useEffect(
		() => {
			if (isOpen && shouldPull) {
				executePullProgress()
			} else if (!isOpen && serverIdsToSyncUponClose.current.size > 0) {
				syncProgress({
					forServers: Array.from(serverIdsToSyncUponClose.current),
					suppressAlerts: true,
				})
				serverIdsToSyncUponClose.current.clear()
			}
		},
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[isOpen, shouldPull],
	)

	const onAcceptBoth = useCallback(
		async (bookId: string, serverId: string, latestRemoteUpdatedAt: string) => {
			await db
				.update(readProgress)
				.set({
					syncStatus: syncStatus.enum.UNSYNCED,
					lastPulledSessionUpdatedAt: parseGraphQLDateTime(latestRemoteUpdatedAt) ?? new Date(),
				})
				.where(eq(readProgress.bookId, bookId))
			serverIdsToSyncUponClose.current.add(serverId)
		},
		[],
	)

	const onApplySyncedSessionData = useCallback(
		async (bookId: string, serverId: string, data: AcceptedProgressionData) => {
			const sessionUpdatedAt = data.sessionUpdatedAt
				? parseGraphQLDateTime(data.sessionUpdatedAt)
				: null
			const values: typeof readProgress.$inferInsert = {
				bookId,
				serverId,
				page: data.page,
				elapsedSeconds: data.elapsedSeconds,
				lastSyncedElapsedSeconds: data.elapsedSeconds, // samsies since we are "syncing" now
				percentage: data.percentageCompleted,
				epubProgress: epubProgress.safeParse(data.locator).data,
				syncStatus: syncStatus.enum.SYNCED, // accepting remote = effectively synced
				lastModified: sessionUpdatedAt ?? new Date(),
				...(sessionUpdatedAt ? { lastPulledSessionUpdatedAt: sessionUpdatedAt } : {}),
				...(data.sessionId != null ? { lastSyncedSessionId: data.sessionId } : {}),
				pendingReset: false,
			}
			await db.insert(readProgress).values(values).onConflictDoUpdate({
				target: readProgress.bookId,
				set: values,
			})
		},
		[],
	)

	const conflictCount = conflictingRecords?.length ?? 0

	return (
		<>
			<TrueSheet
				name={SYNC_CONFLICTS_SHEET_NAME}
				ref={ref}
				detents={[1]}
				grabber
				backgroundColor={colors.sheet.background}
				grabberOptions={{ color: colors.sheet.grabber }}
				header={
					<View className="px-6 py-4 flex-row items-center justify-between">
						<Heading size="lg">{t('syncConflicts.title')}</Heading>
						{conflictCount > 0 && (
							<Badge variant="destructive">
								<Text size="sm" className="text-white font-semibold">
									{t('syncConflicts.remainingCount', { remainingCount: conflictCount })}
								</Text>
							</Badge>
						)}
					</View>
				}
				style={{ paddingBottom: insets.bottom + 16 }}
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={() => {
					setIsOpen(false)
					onDismiss?.()
				}}
				insetAdjustment="automatic"
			>
				{/*i find it irritating i need this key for stuff to show up*/}
				<View key={updatedAt?.toISOString()}>
					{!conflictCount && (
						<View className="p-6 flex-1 justify-center">
							<OwlEmptyState
								title={t('syncConflicts.noConflicts.title')}
								description={t('syncConflicts.noConflicts.description')}
							/>
						</View>
					)}

					{conflictCount > 0 && (
						<ConflictCarousel
							// cast is fine, we in asserted read_progress exists thru query join and filter
							records={(conflictingRecords ?? []) as ConflictRecord[]}
							onAcceptBoth={onAcceptBoth}
							onApplySyncedSessionData={onApplySyncedSessionData}
						/>
					)}
				</View>
			</TrueSheet>

			<SheetBackDetection ref={ref} isOpen={isOpen} />
		</>
	)
}
