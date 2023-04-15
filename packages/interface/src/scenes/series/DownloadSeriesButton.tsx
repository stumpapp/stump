import { IconButton } from '@stump/components'
import { DownloadCloud } from 'lucide-react'

interface Props {
	seriesId: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function DownloadSeriesButton({ seriesId }: Props) {
	return (
		// title="Download series as ZIP archive"
		<IconButton size="sm" variant="ghost" title="I can't do that yet!" disabled>
			<DownloadCloud size="1.25rem" />
		</IconButton>
	)
}
