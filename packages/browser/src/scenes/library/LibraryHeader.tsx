import { useSDK } from '@stump/client'
import { AspectRatio, cn, Heading, Text } from '@stump/components'

import { EntityImage } from '@/components/entity'
import ReadMore from '@/components/ReadMore'
import TagList from '@/components/tags/TagList'
import { usePreferences } from '@/hooks'

import { useLibraryContext } from './context'

export default function LibraryHeader() {
	const { sdk } = useSDK()
	const {
		preferences: { primary_navigation_mode, layout_max_width_px, show_thumbnails_in_headers },
	} = usePreferences()
	const { library, stats } = useLibraryContext()

	const summary = library.description
	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	const renderStats = () => {
		if (!stats) return null

		const bookCount = Number(stats.book_count)
		const completedBooks = Number(stats.completed_books)
		const inProgressBooks = Number(stats.in_progress_books)

		const rawPercentageComplete = (completedBooks / bookCount) * 100
		const percentageComplete = completedBooks > 0 ? rawPercentageComplete.toFixed(2) : 0

		return (
			<>
				{/* TODO: Link that directs to books?read_status=completed and ?read_status=unread */}
				<Text size="xs" variant="muted">
					{percentageComplete}% complete ({completedBooks} of {bookCount} books)
				</Text>

				{/* TODO: Link that directs to books?read_status=reading */}
				<Text size="xs" variant="muted">
					{inProgressBooks} in progress
				</Text>
			</>
		)
	}

	return (
		<header
			className={cn(
				'flex w-full flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between md:gap-0',
				{
					'mx-auto': preferTopBar && !!layout_max_width_px,
				},
			)}
			style={{
				maxWidth: preferTopBar ? layout_max_width_px || undefined : undefined,
			}}
		>
			<div className="flex w-full flex-col items-center gap-4 md:mb-2 md:flex-row md:items-start">
				{show_thumbnails_in_headers && (
					<div className="w-[200px]">
						<AspectRatio ratio={2 / 3}>
							<EntityImage
								src={sdk.library.thumbnailURL(library.id)}
								className="rounded-md object-cover"
							/>
						</AspectRatio>
					</div>
				)}

				<div className="flex h-full w-full flex-col gap-2 md:gap-4">
					<div className="flex w-full justify-between">
						<div className="flex w-full flex-col items-start">
							<Heading size="lg">{library.name}</Heading>
							<TagList tags={library.tags} />
						</div>

						<div className="flex shrink-0 flex-col items-end">{renderStats()}</div>
					</div>

					{!!summary && (
						<div className="max-w-3xl">
							<ReadMore text={summary} />
						</div>
					)}
				</div>
			</div>
		</header>
	)
}

// const _DEBUG_SUMMARY = `This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read.`
// const _DEBUG_SUMMARY_LONG = `This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read.`
