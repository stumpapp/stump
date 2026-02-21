import { Host, Image } from '@expo/ui/swift-ui'
import { useGraphQLMutation, useSDK } from '@stump/client'
import {
	BookClubBookInput,
	BookClubMemberRole,
	FragmentType,
	graphql,
	useFragment,
} from '@stump/graphql'
import { useQueryClient } from '@tanstack/react-query'
import { ColorSpace, getColor, OKLCH, serialize, set, sRGB } from 'colorjs.io/fn'
import { Archive, Edit, Plus } from 'lucide-react-native'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Easing, Platform, Pressable, View } from 'react-native'
import Dialog from 'react-native-dialog'
import { easeGradient } from 'react-native-easing-gradient'
import LinearGradient from 'react-native-linear-gradient'
import { toast } from 'sonner-native'

import { useColorScheme } from '~/lib/useColorScheme'
import { usePreferencesStore } from '~/stores'

import { ThumbnailImage } from '../image'
import { Icon, Text } from '../ui'
import { AddBookOptionsSheet, type AddBookOptionsSheetRef } from './AddBookOptionsSheet'
import { useBookClubContext } from './context'
import { CurrentBookSheet, CurrentBookSheetRef } from './CurrentBookSheet'
import { getClubBookThumbnailData } from './utils'

ColorSpace.register(sRGB)
ColorSpace.register(OKLCH)

const fragment = graphql(`
	fragment CurrentBookCard on BookClubBook {
		id
		title
		author
		imageUrl
		addedAt
		url
		entity {
			__typename
			id
			resolvedName
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

const archiveBookMutation = graphql(`
	mutation ArchiveCurrentBook($bookClubBookId: ID!) {
		completeBook(bookClubBookId: $bookClubBookId) {
			id
		}
	}
`)

type Props = {
	data?: FragmentType<typeof fragment> | null
}

export function CurrentBookCard({ data }: Props) {
	const { clubId, checkRole } = useBookClubContext()

	const queryClient = useQueryClient()
	const book = useFragment(fragment, data)
	const optionsSheetRef = useRef<AddBookOptionsSheetRef>(null)
	const bookSheetRef = useRef<CurrentBookSheetRef>(null)

	const thumbnailRatio = usePreferencesStore((state) => state.thumbnailRatio)

	const { sdk } = useSDK()

	const imageProps = getClubBookThumbnailData(book, {
		getHeaders: () => ({
			...sdk.customHeaders,
			Authorization: sdk.authorizationHeader || '',
		}),
	})

	const { isDarkColorScheme } = useColorScheme()

	const backgroundGradient = useMemo(() => {
		const averageColor = imageProps?.placeholderData?.averageColor
		if (!averageColor) return null

		const color = getColor(averageColor)
		set(color, {
			'oklch.l': isDarkColorScheme ? 0.25 : 0.88,
			'oklch.c': (c: number) => Math.min(c / 2, 0.2),
		})
		const mutedColor = serialize(color, { format: 'hex' })

		// TODO(colors): I am not great at color science and def think this can be better,
		// i have putzed around with it for a bit but amm moving on
		const { colors: gradientColors, locations: gradientLocations } = easeGradient({
			colorStops: {
				0: { color: mutedColor },
				1: { color: 'transparent' },
			},
			extraColorStopsPerTransition: 16,
			easing: Easing.bezier(0.42, 0, 1, 1),
		})

		return { colors: gradientColors, locations: gradientLocations }
	}, [imageProps?.placeholderData?.averageColor, isDarkColorScheme])

	const spineColor = useMemo(() => {
		const averageColor = imageProps?.placeholderData?.averageColor
		if (!averageColor) return 'rgba(0,0,0,0.25)'

		const color = getColor(averageColor)
		set(color, {
			'oklch.l': (l: number) => Math.max(l - 0.3, 0.1),
		})
		return serialize(color, { format: 'hex' })
	}, [imageProps?.placeholderData?.averageColor])

	const isEmpty = book == null

	const { mutate: addBookToClub } = useGraphQLMutation(addBookMutation, {
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bookClubById', clubId] })
			queryClient.invalidateQueries({ queryKey: ['bookClubContext', clubId] })
			optionsSheetRef.current?.close()
		},
		onError: (error) => {
			console.error('Failed to add book to club', error)
			toast.error('Failed to add book to club', {
				description: error instanceof Error ? error.message : 'An unknown error occurred',
			})
		},
	})

	const handleAddBook = useCallback(
		(input: BookClubBookInput) => {
			addBookToClub({ bookClubId: clubId, input: { book: input } })
		},
		[addBookToClub, clubId],
	)

	const [isShowingArchiveConfirm, setIsShowingArchiveConfirm] = useState(false)

	const { mutate: archiveBook } = useGraphQLMutation(archiveBookMutation, {
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['bookClubById', clubId] })
			queryClient.invalidateQueries({ queryKey: ['bookClubContext', clubId] })
			setIsShowingArchiveConfirm(false)
			toast.success('Book archived', {
				description: 'The current book has been archived',
			})
		},
		onError: (error) => {
			console.error('Failed to archive book', error)
			toast.error('Failed to archive book', {
				description: error instanceof Error ? error.message : 'An unknown error occurred',
			})
		},
	})

	const isModerator = checkRole(BookClubMemberRole.Moderator)

	// TODO(book-club): Render generic placeholder for thumb if no image
	return (
		<>
			<Pressable
				onPress={
					isEmpty && isModerator
						? () => optionsSheetRef.current?.open()
						: () => bookSheetRef.current?.open()
				}
				style={{ flexGrow: 1 }}
			>
				<View className="squircle ios:rounded-[2rem] relative flex-grow overflow-hidden rounded-3xl bg-black/5 dark:bg-white/10">
					{backgroundGradient && (
						<LinearGradient
							colors={backgroundGradient.colors}
							locations={backgroundGradient.locations}
							useAngle
							angle={135}
							style={{ position: 'absolute', inset: 0 }}
						/>
					)}

					<View className="relative flex-grow flex-row gap-6 p-3">
						<View
							className="ml-5"
							style={{
								height: 100,
								transform: [
									{ rotateZ: '-10deg' },
									{ skewY: '3deg' },
									{ scaleX: 0.97 },
									{ translateY: 28 },
								],
							}}
						>
							<View
								style={{
									position: 'absolute',
									left: -5,
									top: 0,
									bottom: 0,
									width: 6,
									backgroundColor: spineColor,
									borderTopLeftRadius: 3,
									borderBottomLeftRadius: 3,
									zIndex: 1,
								}}
							/>

							<ThumbnailImage
								key={imageProps?.url}
								source={{
									uri: imageProps?.url || '',
									headers: imageProps?.headers,
								}}
								placeholderData={imageProps?.placeholderData}
								size={{
									width: 90,
									height: 90 / thumbnailRatio,
								}}
								resizeMode="cover"
								borderAndShadowStyle={{
									shadowRadius: 5,
									shadowOffset: { width: -2, height: 4 },
									shadowColor: 'rgba(0,0,0,0.35)',
								}}
							/>
						</View>

						{isModerator && !isEmpty && (
							<View className="absolute right-3 top-3 flex-row items-center gap-3">
								<Pressable disabled>
									<View className="shrink-0 items-center rounded-full border border-black/10 p-2.5 dark:border-white/20">
										{EditIcon}
									</View>
								</Pressable>
								<Pressable onPress={() => setIsShowingArchiveConfirm(true)} disabled={!book}>
									<View className="shrink-0 items-center rounded-full border border-black/10 p-2.5 dark:border-white/20">
										{ArchiveIcon}
									</View>
								</Pressable>
							</View>
						)}

						{isModerator && isEmpty && (
							<View className="absolute right-3 top-3">
								<View className="shrink-0 items-center rounded-full border border-black/10 p-2.5 dark:border-white/20">
									{PlusIcon}
								</View>
							</View>
						)}

						<View className="flex-1 items-end justify-end gap-2 self-end p-1">
							<Text className="text-right text-base font-medium text-foreground-muted">
								{isEmpty ? 'Add a book' : 'Currently reading'}
							</Text>
						</View>
					</View>
				</View>
			</Pressable>

			{isModerator && (
				<>
					<AddBookOptionsSheet ref={optionsSheetRef} onAddBook={handleAddBook} />

					<Dialog.Container visible={isShowingArchiveConfirm}>
						<Dialog.Title>Archive book</Dialog.Title>

						<Dialog.Description>
							Are you sure you are ready to archive the current book?
						</Dialog.Description>

						<Dialog.Button label="Cancel" onPress={() => setIsShowingArchiveConfirm(false)} />
						<Dialog.Button
							label="Archive"
							onPress={() => archiveBook({ bookClubBookId: book?.id || '' })}
							color="red"
							disabled={!book}
						/>
					</Dialog.Container>
				</>
			)}

			{book && <CurrentBookSheet ref={bookSheetRef} book={book} />}
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
