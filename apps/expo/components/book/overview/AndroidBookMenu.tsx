import { BookMenuFragment } from '@stump/graphql'
import { useRouter } from 'expo-router'
import { ArrowUpRight, BookCheck, CircleMinus, CopyMinus, Trash } from 'lucide-react-native'
import { Fragment } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	icons,
	Text,
} from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { cn } from '~/lib/utils'

const { Ellipsis, Heart } = icons

type Props = {
	book: BookMenuFragment
	isFavorite: boolean
	favoriteBook: () => void
	isDownloaded: boolean
	deleteBookDownload: () => void
	completeBook: () => void
	deleteCurrentSession: () => void
	deleteReadHistory: () => void
}

export default function AndroidBookMenu({
	book,
	isFavorite,
	favoriteBook,
	isDownloaded,
	deleteBookDownload,
	completeBook,
	deleteCurrentSession,
	deleteReadHistory,
}: Props) {
	const router = useRouter()
	const insets = useSafeAreaInsets()
	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 4,
		right: 4,
	}

	const isReading = !!book.readProgress
	const isPreviouslyCompleted = !!book.readHistory?.length
	const isUntouched = !isReading && !isPreviouslyCompleted

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button className="squircle h-8 w-8 rounded-full p-0" variant="ghost" size="icon">
					<View>
						<Ellipsis size={20} className="text-foreground" />
					</View>
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				insets={contentInsets}
				sideOffset={2}
				className="w-3/5 tablet:w-64"
				align="end"
			>
				<DropdownMenuItem onPress={favoriteBook}>
					<Text className="text-lg">{isFavorite ? 'Unfavorite' : 'Favorite'}</Text>
					<Heart
						size={20}
						className={cn('ml-auto text-foreground-muted', {
							'fill-fill-danger text-fill-danger-secondary': isFavorite,
						})}
					/>
				</DropdownMenuItem>
				<DropdownMenuSeparator variant="group" />

				<DropdownMenuGroup>
					{(isUntouched || isReading) && (
						<Fragment>
							<DropdownMenuItem onPress={completeBook}>
								<Text className="text-lg">Mark as Read</Text>
								<Icon as={BookCheck} size={20} className={cn('ml-auto text-foreground-muted')} />
							</DropdownMenuItem>
							{(isReading || isPreviouslyCompleted) && <DropdownMenuSeparator />}
						</Fragment>
					)}

					{isReading && (
						<Fragment>
							<DropdownMenuItem onPress={deleteCurrentSession}>
								<Text className="text-lg">Clear Progress</Text>
								<Icon as={CircleMinus} size={20} className={cn('ml-auto text-foreground-muted')} />
							</DropdownMenuItem>
							{isPreviouslyCompleted && <DropdownMenuSeparator />}
						</Fragment>
					)}

					{isPreviouslyCompleted && (
						<DropdownMenuItem onPress={deleteReadHistory}>
							<Text className="text-lg">Delete Read History</Text>
							<Icon as={CopyMinus} size={20} className={cn('ml-auto text-foreground-muted')} />
						</DropdownMenuItem>
					)}
				</DropdownMenuGroup>
				<DropdownMenuSeparator variant="group" />

				<DropdownMenuGroup>
					<DropdownMenuItem
						onPress={() =>
							router.push({
								// @ts-expect-error: I need to use less ambiguous [id]s, e.g. [libraryId]
								pathname: `/server/${book.id}/libraries/${book.library.id}`,
							})
						}
					>
						<View>
							<Text className="text-lg">Go to Library</Text>
							<Text className="text-sm text-foreground-muted">{book.library.name}</Text>
						</View>
						<Icon as={ArrowUpRight} size={20} className={cn('ml-auto text-foreground-muted')} />
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						onPress={() =>
							router.push({
								// @ts-expect-error: I need to use less ambiguous [id]s, e.g. [libraryId]
								pathname: `/server/${book.id}/series/${book.series.id}`,
							})
						}
					>
						<View>
							<Text className="text-lg">Go to Series</Text>
							<Text className="text-sm text-foreground-muted">{book.series.resolvedName}</Text>
						</View>
						<Icon as={ArrowUpRight} size={20} className={cn('ml-auto text-foreground-muted')} />
					</DropdownMenuItem>
				</DropdownMenuGroup>

				{isDownloaded && (
					<>
						<DropdownMenuSeparator variant="group" />
						<DropdownMenuItem onPress={deleteBookDownload}>
							<Text className="text-lg text-fill-danger">Delete Download</Text>
							<Icon as={Trash} size={20} className={cn('ml-auto text-fill-danger')} />
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
