import { Heading, Text } from '@stump/components'
import { Media } from '@stump/types'

import { useAppContext } from '../../context'
import { formatBytes } from '../../utils/format'

// FIXME: awful on mobile...
type Props = {
	media: Media
}
export default function BookFileInformation({ media }: Props) {
	const { isServerOwner } = useAppContext()

	return (
		<div className="flex flex-col space-y-1.5 pb-3 pt-2 text-sm">
			<Heading size="xs">File Information</Heading>
			<div className="flex space-x-4">
				<Text size="sm" variant="muted">
					Size: {formatBytes(media.size)}
				</Text>
				<Text size="sm" variant="muted">
					Kind: {media.extension?.toUpperCase()}
				</Text>
			</div>
			<Text size="sm" variant="muted">
				Hash: {media.hash}
			</Text>
			{isServerOwner && (
				<Text size="sm" variant="muted">
					Path: {media.path}
				</Text>
			)}
		</div>
	)
}
