import { CloudArrowDown } from 'phosphor-react'

import { IconButton } from '../../ui/Button'

interface Props {
	seriesId: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function DownloadSeriesButton({ seriesId }: Props) {
	return (
		// title="Download series as ZIP archive"
		<IconButton title="I can't do that yet!" disabled size="md">
			<CloudArrowDown size="1.25rem" />
		</IconButton>
	)
}
