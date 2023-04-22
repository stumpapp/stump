import { useUpNextInSeries } from '@stump/client'
import { ButtonOrLink } from '@stump/components'

import paths from '../../paths'
import { EBOOK_EXTENSION } from '../../utils/patterns'

type Props = {
	seriesId: string
	title?: string
}

export default function UpNextInSeriesButton({ seriesId, title, ...props }: Props) {
	const { media, isLoading } = useUpNextInSeries(seriesId)

	if (!media) {
		return null
	}

	const currentPage = media.current_page || -1

	const getTitle = () => {
		if (currentPage > -1 || !!media.current_epubcfi) {
			//? I think this phrasing could be a little awkward for collection-based
			//? ebook series. Not sure what a better alternative might be.
			return 'Continue reading'
		} else {
			return 'Start reading'
		}
	}

	const getHref = () => {
		if (media.current_epubcfi || media.extension?.match(EBOOK_EXTENSION)) {
			return paths.bookReader(media.id, {
				epubcfi: media.current_epubcfi,
				isEpub: true,
			})
		} else {
			return paths.bookReader(media?.id || '', { page: media?.current_page || 1 })
		}
	}

	const renderedTitle = title ?? getTitle()

	return (
		<ButtonOrLink
			variant="primary"
			disabled={!isLoading && !media}
			href={getHref()}
			title={renderedTitle}
			{...props}
		>
			{renderedTitle}
		</ButtonOrLink>
	)
}
