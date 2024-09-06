import { getMediaDownloadUrl } from '@stump/api'
import { Button, IconButton } from '@stump/components'
import { Media } from '@stump/types'
import { DownloadCloud } from 'lucide-react'
import { useMediaMatch } from 'rooks'

type Props = {
	media: Media
}
export default function DownloadMediaButton({ media }: Props) {
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const bookTitle = media.metadata?.title || media.name

	const renderButton = () => {
		if (isAtLeastMedium) {
			return (
				<IconButton size="sm" variant="ghost" title={`Download ${bookTitle}`}>
					<DownloadCloud size="1.25rem" />
				</IconButton>
			)
		} else {
			return (
				<Button className="w-full" variant="ghost" title={`Download ${bookTitle}`}>
					<DownloadCloud size="1.25rem" className="mr-2" /> Download Book
				</Button>
			)
		}
	}

	return (
		<a href={getMediaDownloadUrl(media.id)} download>
			{renderButton()}
		</a>
	)
}
