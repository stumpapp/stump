import { usePreferences } from '@stump/client'
import { cn, Heading } from '@stump/components'
import React from 'react'
import { useMediaMatch } from 'rooks'

import ReadMore from '@/components/ReadMore'
import TagList from '@/components/tags/TagList'

import { useLibraryContext } from './context'

export default function LibraryHeader() {
	const {
		preferences: { primary_navigation_mode, layout_max_width_px },
	} = usePreferences()
	const { library, stats } = useLibraryContext()

	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const summary = library.description
	const preferTopBar = primary_navigation_mode === 'TOPBAR'

	console.debug({ stats })

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
			<div className="flex flex-col items-center gap-4 md:mb-2 md:flex-row md:items-start">
				{/* TODO: preference for showing library thumbnails */}
				{/* <div className="w-[200px]">
					<AspectRatio ratio={2 / 3}>
						<img src={getLibraryThumbnail(library.id)} className="rounded-md object-cover" />
					</AspectRatio>
				</div> */}

				<div className="flex h-full w-full flex-col gap-2 md:gap-4">
					<div className="flex flex-col items-start">
						<Heading size="lg">{library.name}</Heading>
						<TagList tags={library.tags} />
					</div>

					{isAtLeastMedium && !!summary && <ReadMore text={summary} />}
					{!isAtLeastMedium && !!summary && (
						<div>
							<Heading size="xs" className="mb-0.5">
								Summary
							</Heading>
							<ReadMore text={summary} />
						</div>
					)}
				</div>
			</div>
		</header>
	)
}
