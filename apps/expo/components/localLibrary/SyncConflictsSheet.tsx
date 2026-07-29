import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { parseGraphQLPercentageDecimal } from '@stump/client'
import { useMutation } from '@tanstack/react-query'
import { intlFormat } from 'date-fns'
import { and, eq, isNotNull } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	conflictingSource,
	db,
	downloadedFiles,
	epubProgress,
	readProgress,
	SyncConflictData,
	syncStatus,
} from '~/db'
import { useColors } from '~/lib/constants'
import { useProgressSync, useTranslate } from '~/lib/hooks'

import { OwlEmptyState } from '../OwlEmptyState'
import { SheetBackDetection } from '../SheetBackDetection'
import { Button, Card, Text } from '../ui'

export const SYNC_CONFLICTS_SHEET_NAME = 'syncConflictsSheet'

type Props = {
	onDismiss?: () => void
}

export function SyncConflictsSheet({ onDismiss }: Props) {
	const ref = useRef<TrueSheet | null>(null)
	const colors = useColors()
	const insets = useSafeAreaInsets()

	const [isOpen, setIsOpen] = useState(false)

	const { data: conflictingRecords, updatedAt } = useLiveQuery(
		db
			.select()
			.from(downloadedFiles)
			.leftJoin(readProgress, eq(downloadedFiles.id, readProgress.bookId))
			.where(and(eq(readProgress.syncStatus, 'CONFLICT'), isNotNull(readProgress.conflictData))),
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
	const isInitialLoad = useMemo(() => !updatedAt, [updatedAt])

	const onDismissInternal = () => {
		setIsOpen(false)
		onDismiss?.()
	}

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
				...new Set(conflictingRecords?.map((record) => record.downloaded_files.serverId) || []),
			]
			return pullProgress({ forServers: serverIds, suppressAlerts: true })
		},
		throwOnError: false,
	})

	const serverIdsToSyncUponClose = useRef(new Set<string>())

	// if the earliest sync was <= 5 min ago, we can avoid the refresh
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

	const locallyPersistProgress = async (
		bookId: string,
		serverId: string,
		progression: SyncConflictData,
	) => {
		const now = new Date()
		const values: typeof readProgress.$inferInsert = {
			bookId,
			serverId,
			page: progression.page,
			elapsedSeconds: progression.elapsedSeconds,
			lastSyncedElapsedSeconds: progression.elapsedSeconds,
			percentage: progression.percentageCompleted,
			epubProgress: epubProgress.safeParse(progression.locator).data,
			syncStatus: syncStatus.enum.UNSYNCED,
			conflictData: null,
			lastModified: now,
			// TODO: i def need to think about this one!!
			pendingReset: false,
		}
		await db.insert(readProgress).values(values).onConflictDoUpdate({
			target: readProgress.bookId,
			set: values,
		})
		serverIdsToSyncUponClose.current.add(serverId)
	}

	// TODO: idea? when hitting e.g.:
	// accept local -> locallyPersistProgress with local data
	// accept remote -> locallyPersistProgress with remote data
	// then -> flow through existing push progress flow (no need to reinvent)
	// but we don't want to trigger every accept, probably just after close of sheet IF something was accepted

	// TODO: looks POOPY
	return (
		<>
			<TrueSheet
				name={SYNC_CONFLICTS_SHEET_NAME}
				ref={ref}
				detents={[0.8, 1]}
				grabber
				scrollable
				backgroundColor={colors.sheet.background}
				grabberOptions={{
					color: colors.sheet.grabber,
				}}
				// ugly ass ui ignored, not sure if we want a quick accept all button. at the very
				// least we would want a confirm if we did
				// header={
				// 	conflictingRecords?.length > 0 ? (
				// 		<View className="gap-4 px-6 pt-6 flex-row justify-end">
				// 			<Button size="sm" roundness="full">
				// 				<Text>Accept All Local</Text>
				// 			</Button>
				// 			<Button size="sm" roundness="full">
				// 				<Text>Accept All Remote</Text>
				// 			</Button>
				// 		</View>
				// 	) : undefined
				// }
				style={{
					paddingBottom: insets.bottom + 16,
				}}
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={onDismissInternal}
				insetAdjustment="automatic"
			>
				<ScrollView className="p-6 flex-1" nestedScrollEnabled>
					{isInitialLoad && conflictingRecords?.length === 0 && (
						<OwlEmptyState
							title="No Sync Conflicts"
							description="All your progress is in sync across devices"
							// owl="happy"
						/>
					)}

					{conflictingRecords.map((record) => (
						<SyncConflictRow
							key={record.downloaded_files.id}
							// the cast is largely safe since we left joined on read_progress
							book={record as SyncConflictRowProps['book']}
							onAcceptVersion={(data) =>
								locallyPersistProgress(
									record.downloaded_files.id,
									record.downloaded_files.serverId,
									data,
								)
							}
						/>
					))}
				</ScrollView>
			</TrueSheet>

			<SheetBackDetection ref={ref} isOpen={isOpen} />
		</>
	)
}

type SyncConflictRowProps = {
	book: {
		downloaded_files: typeof downloadedFiles.$inferSelect
		read_progress: typeof readProgress.$inferSelect
	}
	onAcceptVersion: (data: SyncConflictData) => void
}

function SyncConflictRow({ book }: SyncConflictRowProps) {
	const { t } = useTranslate()

	const name = book.downloaded_files.bookName || book.downloaded_files.filename

	const localProgress = {
		page: book.read_progress.page,
		elapsedSeconds: book.read_progress.elapsedSeconds,
		percentageCompleted: parseGraphQLPercentageDecimal(book.read_progress.percentage),
		chapter: epubProgress.safeParse(book.read_progress.epubProgress).data?.chapterTitle,
		updatedAt: book.read_progress.lastModified,
	}

	const conflictData = conflictingSource.safeParse(book.read_progress?.conflictData).data
	const remoteProgress = conflictData
		? {
				page: conflictData.page,
				elapsedSeconds: conflictData.elapsedSeconds,
				percentageCompleted: parseGraphQLPercentageDecimal(conflictData.percentageCompleted),
				chapter: epubProgress.safeParse(conflictData?.locator).data?.chapterTitle,
				updatedAt: conflictData.updatedAt,
			}
		: null

	const renderProgress = ({
		page,
		chapter,
		percentageCompleted,
	}: NonNullable<typeof remoteProgress>) => {
		if (!page && !chapter && !percentageCompleted) return null
		const progressParts = []
		if (chapter) progressParts.push(chapter)
		if (page) progressParts.push(t('common.pageX', { current: page }))

		const percentageSuffix = percentageCompleted ? ` (${Math.round(percentageCompleted)}%)` : ''

		return progressParts.join(', ') + percentageSuffix
	}

	// this really should not happen
	if (!remoteProgress) {
		return null
	}

	// TODO: went back and forth a LOT with ui, ignoring for now just to get on page
	return (
		<Card label={name}>
			<Card.Row label="Local">
				<View className="gap-1">
					<Text numberOfLines={1} className="text-foreground-muted">
						{renderProgress(localProgress)}
					</Text>

					<Text numberOfLines={1} size="lg">
						{intlFormat(localProgress.updatedAt, {
							month: 'short',
							day: 'numeric',
							hour: 'numeric',
							minute: 'numeric',
						})}
					</Text>
				</View>
			</Card.Row>

			<Card.Row label="Remote">
				<View className="gap-1">
					<Text numberOfLines={1} className="text-foreground-muted">
						{renderProgress(remoteProgress)}
					</Text>

					<Text numberOfLines={1} size="lg">
						{intlFormat(remoteProgress.updatedAt, {
							month: 'short',
							day: 'numeric',
							hour: 'numeric',
							minute: 'numeric',
						})}
					</Text>
				</View>
			</Card.Row>

			<Card.Row className="justify-end">
				<View className="gap-4 flex-row">
					<Button size="sm" roundness="full" variant="outline">
						<Text>Accept Local</Text>
					</Button>
					<Button size="sm" roundness="full">
						<Text>Accept Remote</Text>
					</Button>
				</View>
			</Card.Row>
		</Card>
	)
}
