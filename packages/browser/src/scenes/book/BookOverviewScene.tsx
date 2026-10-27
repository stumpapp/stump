import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import { useBookOverview } from '@/components/book'
import { BookHeader } from '@/components/book/BookHeader'
import { BookInfoSheet } from '@/components/book/BookInfoSheet'
import { BookOverviewDetails } from '@/components/book/BookOverviewDetails'
import { BookReadActions } from '@/components/book/BookReadActions'
import { SceneContainer } from '@/components/container'
import { ProminentThumbnailImage } from '@/components/thumbnail'

import BooksAfterCursor from './BooksAfterCursor'

export default function BookOverviewScene() {
	const { id } = useParams()
	const {
		data: { mediaById: media },
	} = useBookOverview(id || '')

	if (!media) {
		throw new Error('Book not found')
	}

	const [isInfoSheetOpen, setIsInfoSheetOpen] = useState(false)

	useEffect(() => {
		const el =
			document.querySelector('[data-artificial-scroll="true"]') || document.getElementById('main')
		el?.scrollTo({ top: 0, behavior: 'smooth' })
	}, [id])

	return (
		<>
			<Helmet>
				<title>Stump | {media.resolvedName}</title>
			</Helmet>

			<BookHeader fragment={media} onInfoClick={() => setIsInfoSheetOpen(true)} />

			<SceneContainer className="gap-8 @container">
				<div className="gap-6 @xl:grid-cols-[11rem_minmax(0,1fr)] @3xl:grid-cols-[13rem_minmax(0,1fr)] grid grid-cols-1">
					<div className="gap-3 @xl:max-w-none max-w-56 mx-auto flex w-full flex-col">
						<ProminentThumbnailImage
							src={media.thumbnail.url}
							alt={media.resolvedName}
							placeholderData={media.thumbnail.metadata}
						/>
						<BookReadActions fragment={media} />
					</div>

					<BookOverviewDetails fragment={media} />
				</div>

				{media.seriesId && <BooksAfterCursor cursor={media.id} />}
			</SceneContainer>

			<BookInfoSheet
				fragment={media}
				isOpen={isInfoSheetOpen}
				onClose={() => setIsInfoSheetOpen(false)}
			/>
		</>
	)
}
