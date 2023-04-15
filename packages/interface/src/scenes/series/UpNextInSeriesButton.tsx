import { useUpNextInSeries } from '@stump/client'
import { ButtonOrLink } from '@stump/components'

import paths from '../../paths'

type Props = {
	seriesId: string
	title?: string
}

export default function UpNextInSeriesButton({ seriesId, title, ...props }: Props) {
	const { media, isLoading } = useUpNextInSeries(seriesId)

	// TODO: Change this once Stump supports epub progress tracking.
	if (media?.extension === 'epub') {
		return null
	}

	const getContent = () => {
		if (media?.current_page) {
			return 'Continue Reading'
		} else {
			return 'Start Reading'
		}
	}

	return (
		<ButtonOrLink
			variant="primary"
			disabled={!isLoading && !media}
			href={paths.bookReader(media?.id || '', { page: media?.current_page || 1 })}
			title={`Continue reading ${media?.name || 'from where you left off'}`}
			{...props}
		>
			{title || getContent()}
		</ButtonOrLink>
	)
}
