import { Host, Image } from '@expo/ui/swift-ui'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { Href, useRouter } from 'expo-router'
import { Book, Library, LucideIcon, Rows3 } from 'lucide-react-native'
import { Platform, Pressable, View } from 'react-native'

import { COLORS } from '~/lib/constants'
import { cn } from '~/lib/utils'

import { useActiveServer } from '../activeServer'
import { CollectionStackedThumbnails } from '../image/collection-image'
import { Icon, Text } from '../ui'

const fragment = graphql(`
	fragment SmartListGridItem on SmartList {
		id
		name
		description
		books(limit: 5) {
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
		meta {
			matchedBooks
			matchedSeries
			matchedLibraries
		}
	}
`)

export type ISmartListGridItemFragment = FragmentType<typeof fragment>

type Props = {
	smartList: ISmartListGridItemFragment
	getLayoutNumber: (id: string, itemCount: number) => number | undefined
}

type StatItemProps = {
	iosIcon: React.ComponentProps<typeof Image>['systemName']
	androidIcon: LucideIcon
	count: number
}

function StatItem({ iosIcon, androidIcon, count }: StatItemProps) {
	const iconSize = 14
	const color = COLORS.dark.foreground.DEFAULT

	return (
		<View className="flex-row items-center gap-1 rounded-full bg-black/70 px-2.5 py-1.5 shadow-lg">
			{Platform.OS === 'ios' ? (
				<Host matchContents>
					<Image systemName={iosIcon} size={iconSize} color={color} />
				</Host>
			) : (
				<Icon as={androidIcon} size={iconSize} color={color} />
			)}
			<Text
				className="font-medium"
				style={{
					color,
					textShadowOffset: { width: 1, height: 1 },
					textShadowRadius: 1,
					textShadowColor: 'rgba(0, 0, 0, 0.5)',
				}}
			>
				{count}
			</Text>
		</View>
	)
}

export default function SmartListGridItem({ smartList, getLayoutNumber }: Props) {
	const {
		activeServer: { id: serverID },
	} = useActiveServer()
	const router = useRouter()
	const data = useFragment(fragment, smartList)

	const title = data.name
	const href: Href = `/server/${serverID}/smart-lists/${data.id}`

	const thumbnailData = data.books.map((b) => b.thumbnail)

	const layoutNumber = getLayoutNumber(data.id, thumbnailData.length)

	const { matchedLibraries, matchedSeries, matchedBooks } = data.meta

	return (
		<View className="w-full items-center">
			{/* TODO: Worth starting prefetch before navigate? */}
			<Pressable onPress={() => router.navigate(href)}>
				{({ pressed }) => (
					<View className={cn('relative', { 'opacity-80': pressed })}>
						<CollectionStackedThumbnails
							thumbnailData={thumbnailData}
							layoutNumber={layoutNumber}
						/>

						{/* Note: I've tried a few variations of placement and didn't love many but this was most OK */}
						<View className="absolute left-0 top-0 z-20 flex-row gap-2 px-4 py-2">
							<StatItem iosIcon="books.vertical" androidIcon={Library} count={matchedLibraries} />
							<StatItem iosIcon="square.stack" androidIcon={Rows3} count={matchedSeries} />
							<StatItem iosIcon="book.closed" androidIcon={Book} count={matchedBooks} />
						</View>

						<View className="absolute bottom-0 left-0 z-20 w-full px-4 py-2">
							<Text
								size="2xl"
								className="font-bold leading-8 tracking-wide"
								numberOfLines={1}
								ellipsizeMode="tail"
								style={{
									textShadowOffset: { width: 2, height: 1 },
									textShadowRadius: 2,
									textShadowColor: 'rgba(0, 0, 0, 0.5)',
									zIndex: 20,
									color: COLORS.dark.foreground.DEFAULT,
								}}
							>
								{title}
							</Text>
						</View>
					</View>
				)}
			</Pressable>
		</View>
	)
}
