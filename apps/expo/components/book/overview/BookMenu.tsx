import { useGraphQLMutation } from '@stump/client'
import { BookByIdQuery, FragmentType, graphql, useFragment } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { and, eq } from 'drizzle-orm'
import { useLiveQuery } from 'drizzle-orm/expo-sqlite'
import { Stack, useNavigation, useRouter } from 'expo-router'
import { useCallback, useLayoutEffect } from 'react'
import { Alert, Platform } from 'react-native'

import { useActiveServer } from '~/components/activeServer'
import { db, downloadedFiles } from '~/db'
import { useDownload, useTranslate } from '~/lib/hooks'
import { useFavoriteBook } from '~/lib/hooks/useFavoriteBook'

import AndroidBookMenu from './AndroidBookMenu'

const fragment = graphql(`
	fragment BookMenu on Media {
		id
		resolvedName
		isFavorite
		library {
			id
			name
		}
		series {
			id
			resolvedName
		}
		readProgress {
			__typename
		}
		readHistory {
			__typename
		}
	}
`)

const completedMutation = graphql(`
	mutation BookMenuComplete($id: ID!) {
		finishMediaProgress(id: $id)
	}
`)

const deleteMutation = graphql(`
	mutation BookMenuDeleteSession($id: ID!) {
		clearMediaProgress(id: $id)
	}
`)

const deleteHistoryMutation = graphql(`
	mutation BookMenuDeleteHistory($id: ID!) {
		deleteMediaReadingHistory(id: $id)
	}
`)

type Props = {
	data: FragmentType<typeof fragment>
}

export default function BookMenu({ data }: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const { t } = useTranslate()
	const client = useQueryClient()
	const book = useFragment(fragment, data)

	const { deleteBook: deleteBookRpc } = useDownload()

	const {
		data: [downloadedFile],
	} = useLiveQuery(
		db
			.select({ id: downloadedFiles.id })
			.from(downloadedFiles)
			.where(and(eq(downloadedFiles.id, book.id), eq(downloadedFiles.serverId, serverID)))
			.limit(1),
	)
	const isDownloaded = !!downloadedFile as boolean

	const deleteBook = useCallback(() => deleteBookRpc(book.id), [deleteBookRpc, book.id])

	const onFavoriteChanged = useCallback(
		(isFavorite: boolean) => {
			client.setQueryData(['bookById', book.id], (oldData: BookByIdQuery | undefined) => {
				if (!oldData) return

				return {
					...oldData,
					mediaById: {
						...oldData.mediaById,
						isFavorite,
					},
				}
			})
		},
		[client, book.id],
	)

	const { isFavorite, favoriteBook } = useFavoriteBook({
		id: book.id,
		onSuccess: onFavoriteChanged,
		isFavorite: book.isFavorite,
	})

	const onSuccess = useCallback(
		() =>
			Promise.all([
				client.refetchQueries({ queryKey: ['bookById', book.id] }),
				client.invalidateQueries({ queryKey: ['continueReading'], exact: false }),
				client.refetchQueries({ queryKey: ['onDeck'], exact: false }),
				client.refetchQueries({ queryKey: ['recentlyAddedBooks'], exact: false }),
				client.refetchQueries({ queryKey: ['recentlyAddedSeries'], exact: false }),
			]),
		[client, book.id],
	)

	const { mutate: completeBook } = useGraphQLMutation(completedMutation, {
		onSuccess,
		onError: (error) => {
			console.error(error)
			// toast.error('Failed to update book completion status')
		},
	})
	const { mutate: deleteCurrentSession } = useGraphQLMutation(deleteMutation, {
		onSuccess,
		onError: (error) => {
			console.error(error)
			// toast.error('Failed to delete current session')
		},
	})
	const { mutate: deleteReadHistory } = useGraphQLMutation(deleteHistoryMutation, {
		onSuccess,
		onError: (error) => {
			console.error(error)
			// toast.error('Failed to delete read history')
		},
	})

	const confirmMarkAsRead = () => {
		Alert.alert(
			t('bookActions.markAsRead.label'),
			t('bookActions.markAsRead.confirmation', {
				bookTitle: book.resolvedName,
			}),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{
					text: t('bookActions.markAsRead.label'),
					onPress: () => completeBook({ id: book.id }),
				},
			],
		)
	}

	const confirmClearProgress = () => {
		Alert.alert(
			t('bookActions.clearProgress.label'),
			t('bookActions.clearProgress.confirmation', {
				bookTitle: book.resolvedName,
			}),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{
					text: t('common.clear'),
					style: 'destructive',
					onPress: () => deleteCurrentSession({ id: book.id }),
				},
			],
		)
	}

	const confirmDeleteReadHistory = () => {
		Alert.alert(
			t('bookActions.deleteReadHistory.label'),
			t('bookActions.deleteReadHistory.confirmation', {
				bookTitle: book.resolvedName,
			}),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{
					text: t('bookActions.deleteReadHistory.label'),
					style: 'destructive',
					onPress: () => deleteReadHistory({ id: book.id }),
				},
			],
		)
	}

	const confirmDeleteDownload = () => {
		Alert.alert(
			t('bookActions.deleteDownload.label'),
			t('bookActions.deleteDownload.confirmation', {
				bookTitle: book.resolvedName,
			}),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{
					text: t('common.delete'),
					style: 'destructive',
					onPress: () => deleteBook(),
				},
			],
		)
	}

	const isReading = !!book.readProgress
	const isPreviouslyCompleted = !!book.readHistory?.length
	const isUntouched = !isReading && !isPreviouslyCompleted

	const router = useRouter()

	return Platform.select({
		android: (
			<AndroidBookMenu
				book={book}
				isFavorite={isFavorite}
				favoriteBook={favoriteBook}
				completeBook={confirmMarkAsRead}
				isDownloaded={isDownloaded}
				deleteBookDownload={deleteBook}
				deleteCurrentSession={confirmClearProgress}
				deleteReadHistory={confirmDeleteReadHistory}
			/>
		),
		ios: (
			<>
				<Stack.Toolbar placement="right">
					<Stack.Toolbar.Menu icon="ellipsis">
						<Stack.Toolbar.Menu inline>
							<Stack.Toolbar.MenuAction
								icon={isFavorite ? 'heart.fill' : 'heart'}
								onPress={() => favoriteBook()}
							>
								{isFavorite ? 'Unfavorite' : 'Favorite'}
							</Stack.Toolbar.MenuAction>
						</Stack.Toolbar.Menu>

						<Stack.Toolbar.Menu inline>
							{(isUntouched || isReading) && (
								<Stack.Toolbar.MenuAction icon="book.closed" onPress={confirmMarkAsRead}>
									{t('bookActions.markAsRead.label')}
								</Stack.Toolbar.MenuAction>
							)}

							{isReading && (
								<Stack.Toolbar.MenuAction icon="minus.circle" onPress={confirmClearProgress}>
									{t('bookActions.clearProgress.label')}
								</Stack.Toolbar.MenuAction>
							)}

							{isPreviouslyCompleted && (
								<Stack.Toolbar.MenuAction
									icon="rectangle.stack.badge.minus"
									onPress={confirmDeleteReadHistory}
								>
									{t('bookActions.deleteReadHistory.label')}
								</Stack.Toolbar.MenuAction>
							)}
						</Stack.Toolbar.Menu>

						<Stack.Toolbar.MenuAction
							icon="arrow.up.right"
							onPress={() => router.push(`/server/${book.id}/libraries/${book.library.id}`)}
							subtitle={book.library.name}
						>
							{t('bookActions.goToLibrary')}
						</Stack.Toolbar.MenuAction>

						<Stack.Toolbar.MenuAction
							icon="arrow.up.right"
							onPress={() => router.push(`/server/${book.id}/series/${book.series.id}`)}
							subtitle={book.series.resolvedName}
						>
							{t('bookActions.goToSeries')}
						</Stack.Toolbar.MenuAction>

						{isDownloaded && (
							<Stack.Toolbar.Menu inline>
								<Stack.Toolbar.MenuAction
									icon="trash"
									onPress={() => confirmDeleteDownload()}
									destructive
								>
									{t('bookActions.deleteDownload.label')}
								</Stack.Toolbar.MenuAction>
							</Stack.Toolbar.Menu>
						)}
					</Stack.Toolbar.Menu>
				</Stack.Toolbar>
			</>
		),
		default: null,
	})
}

export function useBookMenu(book?: FragmentType<typeof fragment> | null) {
	const navigation = useNavigation()
	useLayoutEffect(() => {
		if (book && Platform.OS === 'android') {
			navigation.setOptions({
				headerRight: () => <BookMenu data={book} />,
			})
		}
	}, [navigation, book])

	if (Platform.OS === 'ios' && book) {
		return <BookMenu data={book} />
	}

	return null
}
