import { useSDK } from '@stump/client'
import { AspectRatio, cn, Heading } from '@stump/components'
import React from 'react'

import ReadMore from '@/components/ReadMore'
import TagList from '@/components/tags/TagList'
import { usePreferences } from '@/hooks'

import { useSeriesContext } from './context'

export default function SeriesHeader() {
	const { sdk } = useSDK()
	const {
		preferences: { primary_navigation_mode, layout_max_width_px, show_thumbnails_in_headers },
	} = usePreferences()
	const { series } = useSeriesContext()

	const summary = series.metadata?.summary || series.description
	const name = series.metadata?.title || series.name

	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	const renderStats = () => null

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
				{/* TODO: preference for showing series thumbnails? */}
				{show_thumbnails_in_headers && (
					<div className="w-[200px]">
						<AspectRatio ratio={2 / 3}>
							<img src={sdk.series.thumbnailURL(series.id)} className="rounded-md object-cover" />
						</AspectRatio>
					</div>
				)}

				<div className="flex h-full w-full flex-col gap-2 md:gap-4">
					<div className="flex w-full justify-between">
						<div className="flex w-full flex-col items-start">
							<Heading size="lg">{name}</Heading>
							<TagList tags={series.tags || null} />
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
