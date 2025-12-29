import { cn, Heading } from '@stump/components'

import ReadMore from '@/components/ReadMore'
import TagList from '@/components/tags/TagList'
import { ProminentThumbnailImage } from '@/components/thumbnail'
import { usePreferences } from '@/hooks'

import { useSeriesContext } from './context'

export default function SeriesHeader() {
	const {
		preferences: { primaryNavigationMode, layoutMaxWidthPx, showThumbnailsInHeaders },
	} = usePreferences()
	const {
		series: { resolvedName, resolvedDescription, tags, thumbnail },
	} = useSeriesContext()

	const preferTopBar = primaryNavigationMode === 'TOPBAR'

	const renderStats = () => null

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
					<ProminentThumbnailImage src={thumbnail.url} placeholderData={thumbnail.metadata} />
				)}

				<div className="flex h-full w-full flex-col gap-2 md:gap-4">
					<div className="flex w-full justify-between">
						<div className="flex w-full flex-col items-start">
							<Heading size="lg">{resolvedName}</Heading>
							<TagList tags={tags || null} />
						</div>

						<div className="flex shrink-0 flex-col items-end">{renderStats()}</div>
					</div>

					{!!resolvedDescription && (
						<div className="max-w-3xl">
							<ReadMore text={resolvedDescription} />
						</div>
					)}
				</div>
			</div>
		</header>
	)
}

// const _DEBUG_SUMMARY = `This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read.`
// const _DEBUG_SUMMARY_LONG = `This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read. This is a summary of the library. It should be a brief overview of the library and its contents. However, often times it is LONG - has some _super_ dramatic content, and is just generally a lot to read.`
