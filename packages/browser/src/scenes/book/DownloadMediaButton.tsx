import { useSDK } from '@stump/client'
import { Button, IconButton } from '@stump/components'
import { DownloadCloud } from 'lucide-react'
import { useMediaMatch } from 'rooks'

type Props = {
	id: string
	name: string
}

export default function DownloadMediaButton({ id, name }: Props) {
	const { sdk } = useSDK()
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const renderButton = () => {
		if (isAtLeastMedium) {
			return (
				<IconButton size="sm" variant="ghost" title={`Download ${name}`}>
					<DownloadCloud size="1.25rem" />
				</IconButton>
			)
		} else {
			return (
				<Button className="w-full" variant="ghost" title={`Download ${name}`}>
					<DownloadCloud size="1.25rem" className="mr-2" /> Download Book
				</Button>
			)
		}
	}

	return (
		<a href={sdk.media.downloadURL(id)} download>
			{renderButton()}
		</a>
	)
}
