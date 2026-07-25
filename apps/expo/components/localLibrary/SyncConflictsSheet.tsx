import { TrueSheet } from '@lodev09/react-native-true-sheet'
import { useMutation } from '@tanstack/react-query'
import { eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { forwardRef, useEffect, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { db, downloadedFiles, epubProgress, readProgress, SyncConflictData, syncStatus } from '~/db'
import { useColors } from '~/lib/constants'
import { useProgressSync } from '~/lib/hooks'

export const SYNC_CONFLICTS_SHEET_NAME = 'syncConflictsSheet'

type Props = {
	onDismiss?: () => void
}

export const SyncConflictsSheet = forwardRef<TrueSheet, Props>(function SyncConflictsSheet(
	{ onDismiss },
	ref,
) {
	const colors = useColors()
	const insets = useSafeAreaInsets()

	const [isOpen, setIsOpen] = useState(false)

	const { data: conflictingRecords } = useLiveQuery(
		db
			.select()
			.from(downloadedFiles)
			.leftJoin(readProgress, eq(downloadedFiles.id, readProgress.bookId))
			.where(eq(readProgress.syncStatus, 'CONFLICT')),
	)

	const onDismissInternal = () => {
		setIsOpen(false)
		onDismiss?.()
	}

	const { pullProgress } = useProgressSync()

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

	useEffect(
		() => {
			if (isOpen) {
				executePullProgress()
			}
		},
		// eslint-disable-next-line react-compiler/react-compiler
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[isOpen],
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
	}

	// TODO: idea? when hitting e.g.:
	// accept local -> locallyPersistProgress with local data
	// accept remote -> locallyPersistProgress with remote data
	// then -> flow through existing push progress flow (no need to reinvent)

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
				style={{
					paddingBottom: insets.bottom + 16,
				}}
				onDidPresent={() => setIsOpen(true)}
				onDidDismiss={onDismissInternal}
				insetAdjustment="automatic"
			></TrueSheet>
		</>
	)
})
