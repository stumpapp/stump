import { Host, Image } from '@expo/ui/swift-ui'
import { useGraphQLMutation, useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useLocalSearchParams } from 'expo-router'
import { Archive, Edit, Plus } from 'lucide-react-native'
import { useRef } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { toast } from 'sonner-native'

import { ThumbnailImage } from '../image'
import { Icon, Text } from '../ui'
import { AddBookSheet, AddBookSheetRef } from './AddBookSheet'
import { getClubBookThumbnailData } from './utils'

const fragment = graphql(`
	fragment CurrentBookCard on BookClubBook {
		id
		title
		author
		imageUrl
		addedAt
		entity {
			__typename
			id
			thumbnail {
				url
				metadata {
					averageColor
					colors {
						color
						percentage
					}
					thumbhash
				}
			}
		}
	}
`)

const addBookMutation = graphql(`
	mutation AddBookToClub($bookClubId: ID!, $input: AddBookToClubInput!) {
		addBookToClub(bookClubId: $bookClubId, input: $input) {
			id
		}
	}
`)

type Props = {
	data?: FragmentType<typeof fragment> | null
}
export function CurrentBookCard({ data }: Props) {
	const { clubId } = useLocalSearchParams<{ clubId: string }>()
	const book = useFragment(fragment, data)
	const addSheetRef = useRef<AddBookSheetRef>(null)

	const { sdk } = useSDK()

	const imageProps = getClubBookThumbnailData(book, {
		getHeaders: () => ({
			...sdk.customHeaders,
			Authorization: sdk.authorizationHeader || '',
		}),
	})

	const isEmpty = book == null

	const { mutate: addBookToClub } = useGraphQLMutation(addBookMutation, {
		onSuccess: () => {
			addSheetRef.current?.close()
		},
		onError: (error) => {
			console.error('Failed to add book to club', error)
			toast.error('Failed to add book to club', {
				description: error instanceof Error ? error.message : 'An unknown error occurred',
			})
		},
	})

	// TODO(book-club): Render generic placeholder for thumb if no image
	// TODO(book-club): Add functional "Add a book" state when no current book
	// TODO(book-club): Add gradient background if data available
	return (
		<>
			<View className="squircle ios:rounded-[2rem] relative flex-grow flex-row gap-6 rounded-3xl bg-black/5 p-3 dark:bg-white/10">
				<View className="ml-3">
					<ThumbnailImage
						source={{
							uri: imageProps?.url || '',
							headers: imageProps?.headers,
						}}
						placeholderData={imageProps?.placeholderData}
						size={{
							width: 56,
							height: 80,
						}}
					/>
				</View>

				<View className="absolute right-3 top-3 flex-row items-center gap-3">
					{isEmpty && (
						<Pressable onPress={() => addSheetRef.current?.open()}>
							<View className="shrink-0 items-center rounded-full border border-black/10 p-2.5 dark:border-white/20">
								{PlusIcon}
							</View>
						</Pressable>
					)}

					{!isEmpty && (
						<>
							<Pressable>
								<View className="shrink-0 items-center rounded-full border border-black/10 p-2.5 dark:border-white/20">
									{EditIcon}
								</View>
							</Pressable>
							<Pressable>
								<View className="shrink-0 items-center rounded-full border border-black/10 p-2.5 dark:border-white/20">
									{ArchiveIcon}
								</View>
							</Pressable>
						</>
					)}
				</View>

				<View className="flex-1 items-end justify-end gap-2 self-end p-1">
					<Text className="text-muted-foreground text-right text-base font-medium">
						{isEmpty ? 'Add a book' : 'Currently reading'}
					</Text>
				</View>
			</View>

			<AddBookSheet
				ref={addSheetRef}
				onAddBook={(bookId) =>
					addBookToClub({ bookClubId: clubId, input: { book: { stored: { id: bookId } } } })
				}
			/>
		</>
	)
}

const PlusIcon = Platform.select({
	ios: (
		<Host matchContents>
			<Image systemName="plus" size={14} />
		</Host>
	),
	android: <Icon as={Plus} className="shadow" size={14} />,
})

const EditIcon = Platform.select({
	ios: (
		<Host matchContents>
			<Image systemName="pencil" size={16} />
		</Host>
	),
	android: <Icon as={Edit} className="shadow" size={16} />,
})

const ArchiveIcon = Platform.select({
	ios: (
		<Host matchContents>
			<Image systemName="archivebox" size={16} />
		</Host>
	),
	android: <Icon as={Archive} className="shadow" size={16} />,
})
