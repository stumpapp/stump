import { AspectRatio, cn, Heading, Text } from '@stump/components'

import { EntityImage } from '@/components/entity'
import ReadMore from '@/components/ReadMore'
import TagList from '@/components/tags/TagList'
import { usePreferences } from '@/hooks'

import { useLibraryContext } from './context'

export default function LibraryHeader() {
	const {
		preferences: { primaryNavigationMode, layoutMaxWidthPx, showThumbnailsInHeaders },
	} = usePreferences()
	const {
		library: { name, description, stats, tags, thumbnail },
	} = useLibraryContext()

	const preferTopBar = primaryNavigationMode === 'TOPBAR'

	const renderStats = () => {
		if (!stats) return null

		const { bookCount, completedBooks, inProgressBooks } = stats

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
					'mx-auto': preferTopBar && !!layoutMaxWidthPx,
				},
			)}
			style={{
				maxWidth: preferTopBar ? layoutMaxWidthPx || undefined : undefined,
			}}
		>
			<div className="flex w-full flex-col items-center gap-4 md:mb-2 md:flex-row md:items-start">
				{showThumbnailsInHeaders && (
					<div className="w-[200px]">
						<AspectRatio ratio={2 / 3}>
							<EntityImage src={thumbnail.url} className="rounded-md object-cover" />
						</AspectRatio>
					</div>
				)}

				<div className="flex h-full w-full flex-col gap-2 md:gap-4">
					<div className="flex w-full justify-between">
						<div className="flex w-full flex-col items-start">
							<Heading size="lg">{name}</Heading>
							<TagList tags={tags} />
						</div>

						<div className="flex shrink-0 flex-col items-end">{renderStats()}</div>
					</div>

					{!!description && (
						<div className="max-w-3xl">
							<ReadMore text={description} />
						</div>
					)}
				</div>
			</div>
		</header>
	)
}

// const _DEBUG_SUMMARY = `This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read.`
// const _DEBUG_SUMMARY_LONG = `This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read.`
