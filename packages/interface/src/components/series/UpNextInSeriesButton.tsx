import { useUpNextInSeries } from '@stump/client'
import { Link } from 'react-router-dom'

import Button, { ButtonProps } from '../../ui/Button'

type Props = {
	seriesId: string
	title?: string
} & ButtonProps

export default function UpNextInSeriesButton({ seriesId, title, ...props }: Props) {
	const { media, isLoading } = useUpNextInSeries(seriesId)

	// TODO: Change this once Stump supports epub progress tracking.
	if (media?.extension === 'epub') {
		return null
	}

	return (
		<Button
			isDisabled={!isLoading && !media}
			as={Link}
			to={`/books/${media?.id}/pages/${media?.current_page || 1}`}
			disabled={!media}
			title={`Continue reading ${media?.name || 'from where you left off'}`}
			colorScheme="brand"
			{...props}
		>
			{title || 'Continue Reading'}
		</Button>
	)
}
