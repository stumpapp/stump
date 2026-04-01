import { Heading } from '@stump/components'
import { useFragment, UserPermission } from '@stump/graphql'
import sortBy from 'lodash/sortBy'
import { Suspense, useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { useParams } from 'react-router'

import { useBookOverview } from '@/components/book'
import { BookCardFragment } from '@/components/book/BookCard'
import { MediaMetadataEditor } from '@/components/book/metadata'
import { SceneContainer } from '@/components/container'
import { ProminentThumbnailImage } from '@/components/thumbnail'
import { useAppContext } from '@/context'

import BookActionMenu from './BookActionMenu'
import BookFileInformation from './BookFileInformation'
import BookOverviewSceneHeader from './BookOverviewSceneHeader'
import BookReaderLink from './BookReaderLink'
import BooksAfterCursor from './BooksAfterCursor'

export default function BookOverviewScene() {
	const { id } = useParams()
	const {
		data: { mediaById: media },
	} = useBookOverview(id || '')
	const { checkPermission } = useAppContext()

	if (!media) {
		throw new Error('Book not found')
	}

	const fragmentData = useFragment(BookCardFragment, media)

	const completedAt = useMemo(
		() =>
			sortBy(media.readHistory, ({ completedAt }) => new Date(completedAt).getTime()).at(-1)
				?.completedAt,
		[media.readHistory],
	)

	useEffect(() => {
		const el =
			document.querySelector('[data-artificial-scroll="true"]') || document.getElementById('main')
		el?.scrollTo({ top: 0, behavior: 'smooth' })
	}, [id])

	return (
		<SceneContainer className="gap-4">
			<Suspense>
				<Helmet>
					<title>Stump | {media.resolvedName}</title>
				</Helmet>

				<div className="gap-4 flex h-full w-full flex-col">
					<div className="gap-3 tablet:mb-2 flex flex-col items-center tablet:flex-row tablet:items-start">
						<div className="max-w-sm gap-3 sm:max-w-[200px] flex w-full shrink-0 flex-col items-center">
							<ProminentThumbnailImage
								src={fragmentData.thumbnail.url}
								alt={media.resolvedName}
								placeholderData={fragmentData.thumbnail.metadata}
							/>
							<div className="gap-2 flex w-full flex-col">
								<BookReaderLink book={fragmentData} />
								<BookActionMenu book={fragmentData} />
							</div>
						</div>

						<BookOverviewSceneHeader media={media} book={fragmentData} completedAt={completedAt} />
					</div>

					<BooksAfterCursor cursor={media.id} />

					<div className="gap-y-2 flex flex-col">
						<Heading size="sm">Metadata</Heading>
						<MediaMetadataEditor mediaId={media.id} data={media.metadata} />
					</div>
				</div>
			</Suspense>

			{/*Note: There is no permission specific to file info but I am just taking a loose assumption here*/}
			{checkPermission(UserPermission.ManageLibrary) && <BookFileInformation fragment={media} />}
		</SceneContainer>
	)
}
