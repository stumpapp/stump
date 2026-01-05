import { UserPermission } from '@stump/graphql'
import { useRouter } from 'expo-router'
import {
	BookCopy,
	BookText,
	ChevronRight,
	FolderTree,
	Heart,
	LibraryBig,
	Rows3,
} from 'lucide-react-native'
import { Fragment } from 'react'
import { Platform, Pressable, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useStumpServer } from '~/components/activeServer'
import { RecentlyAddedSeries } from '~/components/series'
import { Heading, Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { IS_IOS_24_PLUS } from '~/lib/constants'
import { cn } from '~/lib/utils'

const ITEMS = [
	{
		id: 'books',
		title: 'Books',
		icon: BookText,
		to: '/server/[id]/books',
	},
	{
		id: 'favorites',
		title: 'Favorites',
		to: '/server/[id]/favorites',
		icon: Heart,
	},
	{
		id: 'files',
		title: 'Files',
		to: '/server/[id]/files',
		icon: FolderTree,
		permission: UserPermission.FileExplorer,
	},
	{
		id: 'libraries',
		title: 'Libraries',
		to: '/server/[id]/libraries',
		icon: LibraryBig,
	},
	{
		id: 'series',
		title: 'Series',
		icon: BookCopy,
		to: '/server/[id]/series',
	},

	{
		id: 'smart-lists',
		title: 'Smart Lists',
		icon: Rows3,
		permission: UserPermission.AccessSmartList,
		to: '/server/[id]/smart-lists',
	},
]

export default function Screen() {
	const {
		checkPermission,
		activeServer: { id: serverID },
	} = useStumpServer()

	const router = useRouter()

	const visibleItems = ITEMS.filter((item) => !item.permission || checkPermission(item.permission))

	return (
		<SafeAreaView
			style={{ flex: 1 }}
			className="bg-background"
			edges={Platform.OS === 'android' ? [] : []}
		>
			<RecentlyAddedSeries
				header={
					<View className="flex gap-5">
						<View>
							{visibleItems.map((item, idx) => (
								<Fragment key={item.id}>
									<Pressable
										// @ts-expect-error: String path
										onPress={() => router.push({ pathname: item.to, params: { id: serverID } })}
									>
										{({ pressed }) => (
											<View
												className={cn('flex-row items-center justify-between px-4', {
													'opacity-60': pressed,
												})}
											>
												<View
													className={cn('flex flex-row items-center gap-4 py-4', {
														'pt-1': idx === 0,
													})}
												>
													<Icon as={item.icon} className="h-6 w-6" />
													<Text className="text-lg">{item.title}</Text>
												</View>
												<View className={cn('py-4', { 'pt-1': idx === 0 })}>
													<Icon
														as={ChevronRight}
														className="h-6 w-6 text-foreground-muted opacity-70"
													/>
												</View>
											</View>
										)}
									</Pressable>

									<Divider />
								</Fragment>
							))}
						</View>

						<Heading size="xl" className="px-4">
							Recently Added Series
						</Heading>
					</View>
				}
			/>
		</SafeAreaView>
	)
}

const Divider = () => (
	// ios: left padding (px-4) + icon width (w-6) + gap between icon and text (gap-4) = ml-14
	// give ios 26+ right margin too = mr-4
	<View className={cn('ios:ml-14 h-px bg-edge', IS_IOS_24_PLUS && 'mr-4')} />
)
