import { Host, Image } from '@expo/ui/swift-ui'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { BlurTargetView, BlurView, BlurViewProps } from 'expo-blur'
import { Href, useRouter } from 'expo-router'
import { Book, Library, LucideIcon, Rows3 } from 'lucide-react-native'
import { useRef } from 'react'
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
	blurTarget: BlurViewProps['blurTarget']
}

function StatItem({ iosIcon, androidIcon, count, blurTarget }: StatItemProps) {
	const iconSize = 14
	const color = COLORS.dark.foreground.DEFAULT

	return (
		<BlurView
			className="squircle rounded-full"
			intensity={4}
			blurTarget={blurTarget}
			blurMethod="dimezisBlurView"
		>
			<View className="bg-black/40 gap-1 px-2.5 py-1.5 shadow-lg flex-row items-center">
				{Platform.OS === 'ios' ? (
					<Host matchContents>
						<Image systemName={iosIcon} size={iconSize} color={color} />
					</Host>
				) : (
					<Icon as={androidIcon} size={iconSize} color={color} />
				)}
				<Text
					className="font-medium shadow"
					style={{
						color,
					}}
				>
					{count}
				</Text>
			</View>
		</BlurView>
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

	const blurTargetRef = useRef<View>(null)

	return (
		<View className="w-full items-center">
			{/* TODO: Worth starting prefetch before navigate? */}
			<Pressable onPress={() => router.navigate(href)}>
				{({ pressed }) => (
					<View className={cn('relative', { 'opacity-80': pressed })}>
						<BlurTargetView ref={blurTargetRef}>
							<CollectionStackedThumbnails
								thumbnailData={thumbnailData}
								layoutNumber={layoutNumber}
							/>
						</BlurTargetView>

						{/* Note: I've tried a few variations of placement and didn't love many but this was most OK */}
						<View className="left-0 top-0 gap-2 px-4 py-2 absolute z-20 flex-row">
							<StatItem
								iosIcon="books.vertical"
								androidIcon={Library}
								count={matchedLibraries}
								blurTarget={blurTargetRef}
							/>
							<StatItem
								iosIcon="square.stack"
								androidIcon={Rows3}
								count={matchedSeries}
								blurTarget={blurTargetRef}
							/>
							<StatItem
								iosIcon="book.closed"
								androidIcon={Book}
								count={matchedBooks}
								blurTarget={blurTargetRef}
							/>
						</View>

						<View className="bottom-0 left-0 px-4 py-2 absolute z-20 w-full">
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
