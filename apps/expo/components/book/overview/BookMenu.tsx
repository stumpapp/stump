import { Button, ContextMenu, Divider, Host } from '@expo/ui/swift-ui'
import { useGraphQLMutation } from '@stump/client'
import { BookByIdQuery, FragmentType, graphql, useFragment } from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Ellipsis } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import { Platform, View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import * as DropdownMenu from 'zeego/dropdown-menu'

import { IS_IOS_24_PLUS } from '~/lib/constants'
import { useFavoriteBook } from '~/lib/hooks/useFavoriteBook'
import { cn } from '~/lib/utils'
import { useDownload } from '~/stores/download'

import AndroidBookMenu from './AndroidBookMenu'

const fragment = graphql(`
	fragment BookMenu on Media {
		id
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
	mutation BookMenuComplete($id: ID!, $isComplete: Boolean!, $page: Int) {
		markMediaAsComplete(id: $id, isComplete: $isComplete, page: $page) {
			completedAt
		}
	}
`)

const deleteMutation = graphql(`
	mutation BookMenuDeleteSession($id: ID!) {
		deleteMediaProgress(id: $id) {
			__typename
		}
	}
`)

const deleteHistoryMutation = graphql(`
	mutation BookMenuDeleteHistory($id: ID!) {
		deleteMediaReadHistory(id: $id) {
			__typename
		}
	}
`)

type Props = {
	data: FragmentType<typeof fragment>
}

export default function BookMenu({ data }: Props) {
	const client = useQueryClient()
	const book = useFragment(fragment, data)

	const { isBookDownloaded, deleteBook: deleteBookRpc } = useDownload()

	const isDownloaded = useMemo(() => isBookDownloaded(book.id), [isBookDownloaded, book.id])

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

	const isReading = !!book.readProgress
	const isPreviouslyCompleted = !!book.readHistory?.length
	const isUntouched = !isReading && !isPreviouslyCompleted

	const router = useRouter()

	const [isOpen, setIsOpen] = useState(false)

	if (Platform.OS === 'android') {
		return (
			<AndroidBookMenu
				book={book}
				isFavorite={isFavorite}
				favoriteBook={favoriteBook}
				completeBook={() => completeBook({ id: book.id, isComplete: true })}
				isDownloaded={isDownloaded}
				deleteBookDownload={deleteBook}
				deleteCurrentSession={() => deleteCurrentSession({ id: book.id })}
				deleteReadHistory={() => deleteReadHistory({ id: book.id })}
			/>
		)
	}

	// TODO: Once I figure out how to do the subtitles with expo/ui, I can remove zeego
	if (IS_IOS_24_PLUS) {
		return (
			<Host matchContents>
				<ContextMenu>
					<ContextMenu.Trigger>
						<View
							accessibilityLabel="options"
							style={{
								height: 35,
								width: 35,
								justifyContent: 'center',
								alignItems: 'center',
							}}
						>
							<Ellipsis size={24} className="text-foreground" />
						</View>
					</ContextMenu.Trigger>
					<ContextMenu.Items>
						<Button
							systemImage={isFavorite ? 'heart.fill' : 'heart'}
							onPress={() => favoriteBook()}
						>
							{isFavorite ? 'Unfavorite' : 'Favorite'}
						</Button>

						<Divider />

						{(isUntouched || isReading) && (
							<Button
								systemImage="book.closed"
								onPress={() => completeBook({ id: book.id, isComplete: true })}
							>
								Mark as Read
							</Button>
						)}

						{isReading && (
							<Button
								systemImage="minus.circle"
								onPress={() => deleteCurrentSession({ id: book.id })}
							>
								Clear Progress
							</Button>
						)}

						{isPreviouslyCompleted && (
							<Button
								systemImage="rectangle.stack.badge.minus"
								role="destructive"
								onPress={() => deleteReadHistory({ id: book.id })}
							>
								Delete Read History
							</Button>
						)}

						<Divider />

						<Button
							systemImage="arrow.up.right"
							onPress={() =>
								router.push({
									// @ts-expect-error: I need to use less ambiguous [id]s, e.g. [libraryId]
									pathname: `/server/${book.id}/libraries/${book.library.id}`,
								})
							}
						>
							{/* TODO: Expo UI doesn't seem to support anything but strings as children, which means the subtitle is not available :( */}
							{`Go to Library \n${book.library.name}`}
						</Button>

						<Button
							systemImage="arrow.up.right"
							onPress={() =>
								router.push({
									// @ts-expect-error: I need to use less ambiguous [id]s, e.g. [libraryId]
									pathname: `/server/${book.id}/series/${book.series.id}`,
								})
							}
						>
							{/* TODO: Expo UI doesn't seem to support anything but strings as children, which means the subtitle is not available :( */}
							{`Go to Series \n${book.series.resolvedName}`}
						</Button>

						{isDownloaded && (
							<>
								<Divider />

								<Button systemImage="trash" role="destructive" onPress={() => deleteBook()}>
									Delete Download
								</Button>
							</>
						)}
					</ContextMenu.Items>
				</ContextMenu>
			</Host>
		)
	}

	// https://docs.expo.dev/versions/latest/sdk/symbols/
	// https://github.com/nandorojo/zeego/issues/90
	return (
		<DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenu.Trigger>
				<Pressable onPress={() => setIsOpen((prev) => !prev)}>
					{({ pressed }) => (
						<View className={cn(pressed && 'opacity-70')}>
							<Ellipsis size={20} className="text-foreground" />
						</View>
					)}
				</Pressable>
			</DropdownMenu.Trigger>

			<DropdownMenu.Content>
				<DropdownMenu.Item key="isFavorite" onSelect={() => favoriteBook()}>
					<DropdownMenu.ItemIndicator />
					<DropdownMenu.ItemTitle>{isFavorite ? 'Unfavorite' : 'Favorite'}</DropdownMenu.ItemTitle>
					<DropdownMenu.ItemIcon
						ios={{ name: isFavorite ? 'heart.fill' : 'heart' }}
						androidIconName="favorite"
					/>
				</DropdownMenu.Item>

				<DropdownMenu.Group>
					{(isUntouched || isReading) && (
						<DropdownMenu.Item
							key="markAsRead"
							onSelect={() => completeBook({ id: book.id, isComplete: true })}
						>
							<DropdownMenu.ItemIndicator />
							<DropdownMenu.ItemTitle>Mark as Read</DropdownMenu.ItemTitle>
							<DropdownMenu.ItemIcon ios={{ name: 'book.closed' }} />
						</DropdownMenu.Item>
					)}

					{isReading && (
						<DropdownMenu.Item
							key="clearProgress"
							onSelect={() => deleteCurrentSession({ id: book.id })}
						>
							<DropdownMenu.ItemIndicator />
							<DropdownMenu.ItemTitle>Clear Progress</DropdownMenu.ItemTitle>
							<DropdownMenu.ItemIcon ios={{ name: 'minus.circle' }} />
						</DropdownMenu.Item>
					)}

					{isPreviouslyCompleted && (
						<DropdownMenu.Item
							key="deleteHistory"
							onSelect={() => deleteReadHistory({ id: book.id })}
						>
							<DropdownMenu.ItemIndicator />
							<DropdownMenu.ItemTitle>Delete Read History</DropdownMenu.ItemTitle>
							<DropdownMenu.ItemIcon ios={{ name: 'rectangle.stack.badge.minus' }} />
						</DropdownMenu.Item>
					)}
				</DropdownMenu.Group>

				<DropdownMenu.Group>
					<DropdownMenu.Item
						key="library"
						onSelect={() =>
							router.push({
								// @ts-expect-error: I need to use less ambiguous [id]s, e.g. [libraryId]
								pathname: `/server/${book.id}/libraries/${book.library.id}`,
							})
						}
					>
						<DropdownMenu.ItemIndicator />
						<DropdownMenu.ItemTitle>Go to Library</DropdownMenu.ItemTitle>
						<DropdownMenu.ItemSubtitle>{book.library.name}</DropdownMenu.ItemSubtitle>
						<DropdownMenu.ItemIcon ios={{ name: 'arrow.up.right' }} />
					</DropdownMenu.Item>

					<DropdownMenu.Item
						key="series"
						onSelect={() =>
							router.push({
								// @ts-expect-error: I need to use less ambiguous [id]s, e.g. [libraryId]
								pathname: `/server/${book.id}/series/${book.series.id}`,
							})
						}
					>
						<DropdownMenu.ItemIndicator />
						<DropdownMenu.ItemTitle>Go to Series</DropdownMenu.ItemTitle>
						<DropdownMenu.ItemSubtitle>{book.series.resolvedName}</DropdownMenu.ItemSubtitle>
						<DropdownMenu.ItemIcon ios={{ name: 'arrow.up.right' }} />
					</DropdownMenu.Item>
				</DropdownMenu.Group>

				{isDownloaded && (
					<DropdownMenu.Item key="deleteDownload" onSelect={() => deleteBook()}>
						<DropdownMenu.ItemIndicator />
						<DropdownMenu.ItemTitle>Delete Download</DropdownMenu.ItemTitle>
						<DropdownMenu.ItemIcon ios={{ name: 'trash' }} />
					</DropdownMenu.Item>
				)}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	)
}
