import { useLibraryQuery } from '@stump/client'
import { Heading, Text } from '@stump/components'
import { Media } from '@stump/types'

import { formatBytes } from '../../utils/format'

type Props = {
	media: Media
}
// TODO: redesign!!
export default function BookFileInformation({ media }: Props) {
	const { library } = useLibraryQuery({
		params: {
			series: {
				id: media.series_id,
			},
		},
	})
	const libraryPath = library?.path ?? ''

	/**
	 * A function to format a long string to something more readable.
	 *
	 * E.g.: 1234567890abcdef1234567890abcdef12345678 -> 123456...345678
	 */
	const formatHash = (hash: string) => {
		const start = hash.slice(0, 8)
		const end = hash.slice(-8)
		return `${start}...${end}`
	}

	/**
	 * A function to format a path to something more readable. This just removes the library path from the path.
	 */
	const formatPath = (path: string) => path.replace(libraryPath, '')

	return (
		<div className="flex flex-col space-y-1 pb-3 pt-2 text-sm">
			<Heading size="xs">File Information</Heading>
			<div className="flex space-x-4">
				<Text size="sm" variant="muted">
					Size: {formatBytes(media.size.valueOf())}
				</Text>
				<Text size="sm" variant="muted">
					Kind: {media.extension?.toUpperCase()}
				</Text>
			</div>
			{media.hash && (
				<Text size="sm" variant="muted" title={media.hash || ''}>
					Hash: {formatHash(media.hash || '')}
				</Text>
			)}
			<Text size="sm" variant="muted" title={media.path}>
				Relative path: {formatPath(media.path || '')}
			</Text>
		</div>
	)
}
