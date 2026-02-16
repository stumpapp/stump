import { Host, Image } from '@expo/ui/swift-ui'
import { useSDK } from '@stump/client'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { Archive, Edit, Plus } from 'lucide-react-native'
import { useRef } from 'react'
import { Platform, Pressable, View } from 'react-native'

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

type Props = {
	data?: FragmentType<typeof fragment> | null
}
export function CurrentBookCard({ data }: Props) {
	const book = useFragment(fragment, data)

	const sheetRef = useRef<AddBookSheetRef>(null)

	const { sdk } = useSDK()

	const imageProps = getClubBookThumbnailData(book, {
		getHeaders: () => ({
			...sdk.customHeaders,
			Authorization: sdk.authorizationHeader || '',
		}),
	})

	const isEmpty = book == null

	// TODO(book-club): Render generic placeholder for thumb if no image
	// TODO(book-club): Add functional "Add a book" state when no current book
	// TODO(book-club): Add gradient background if data available
	return (
		<>
			<View className="squircle ios:rounded-[2rem] relative flex-grow flex-row gap-6 rounded-3xl bg-black/5 p-3 dark:bg-white/10">
				<View />
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
				<View className="absolute right-3 top-3 flex-row items-center gap-3">
					{isEmpty && (
						<Pressable onPress={() => sheetRef.current?.open()}>
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
					<Text className="text-muted-foreground text-base font-medium">
						{isEmpty ? 'Add a book' : 'Currently reading'}
					</Text>
				</View>
			</View>

			<AddBookSheet ref={sheetRef} />
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
