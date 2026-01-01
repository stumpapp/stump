import dayjs from 'dayjs'
import { Trash2 } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Pressable, View } from 'react-native'

import { Text } from '~/components/ui'
import { Icon } from '~/components/ui/icon'
import { cn } from '~/lib/utils'
import { BookmarkRef, useEpubLocationStore } from '~/stores/epub'
import { useEpubSheetStore } from '~/stores/epubSheet'

type Props = {
	bookmark: BookmarkRef
}

// TODO: This is not the final design I would like to land on, just kinda getting something basic down for now

export default function BookmarkListItem({ bookmark }: Props) {
	const [isDeleting, setIsDeleting] = useState(false)

	const actions = useEpubLocationStore((state) => state.actions)
	const removeBookmark = useEpubLocationStore((state) => state.removeBookmark)
	const onDeleteBookmark = useEpubLocationStore((state) => state.onDeleteBookmark)
	const closeSheet = useEpubSheetStore((state) => state.closeSheet)

	const handleNavigate = useCallback(async () => {
		if (!actions) return

		await actions.goToLocation({
			href: bookmark.href,
			chapterTitle: bookmark.chapterTitle || '',
			locations: bookmark.locations || undefined,
			type: 'application/xhtml+xml',
		})

		closeSheet('locations')
	}, [actions, bookmark, closeSheet])

	const handleDelete = useCallback(async () => {
		if (isDeleting || !onDeleteBookmark) return

		setIsDeleting(true)
		try {
			await onDeleteBookmark(bookmark.id)
			removeBookmark(bookmark.id)
		} catch (error) {
			console.error('Failed to delete bookmark:', error)
		} finally {
			setIsDeleting(false)
		}
	}, [bookmark.id, isDeleting, onDeleteBookmark, removeBookmark])

	const displayTitle = bookmark.chapterTitle || 'Unknown location'
	const displayPreview = bookmark.previewContent
		? bookmark.previewContent.length > 100
			? `${bookmark.previewContent.slice(0, 100)}...`
			: bookmark.previewContent
		: null
	const displayDate = bookmark.createdAt ? dayjs(bookmark.createdAt).format('MMM D, YYYY') : null

	return (
		<View className="flex-row items-center">
			<Pressable onPress={handleNavigate} className="flex-1">
				{({ pressed }) => (
					<View
						className={cn('flex-1 px-4 py-3', {
							'opacity-70': pressed,
						})}
					>
						<Text className="text-base font-medium" numberOfLines={1}>
							{displayTitle}
						</Text>

						{displayPreview && (
							<Text className="mt-1 text-sm text-foreground-muted" numberOfLines={2}>
								&ldquo;{displayPreview}&rdquo;
							</Text>
						)}

						{displayDate && (
							<Text className="mt-1 text-xs text-foreground-subtle">{displayDate}</Text>
						)}
					</View>
				)}
			</Pressable>

			{onDeleteBookmark && (
				<Pressable
					onPress={handleDelete}
					disabled={isDeleting}
					className="px-4 py-3"
					hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
				>
					{({ pressed }) => (
						<Icon
							as={Trash2}
							className="h-5 w-5 text-fill-danger"
							style={{
								opacity: isDeleting ? 0.4 : pressed ? 0.7 : 1,
							}}
						/>
					)}
				</Pressable>
			)}
		</View>
	)
}
