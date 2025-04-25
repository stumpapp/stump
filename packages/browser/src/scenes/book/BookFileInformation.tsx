import { Heading, Text } from '@stump/components'
import { BookOverviewSceneQuery } from '@stump/graphql'

import { formatBytes } from '../../utils/format'

type BookFileInformationFragment = Pick<
	NonNullable<BookOverviewSceneQuery['mediaById']>,
	'hash' | 'extension' | 'size' | 'relativeLibraryPath'
>

type Props = {
	data: BookFileInformationFragment
}

// TODO: redesign!!
export default function BookFileInformation({ data }: Props) {
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

	return (
		<div className="flex flex-col space-y-1 pb-3 pt-2 text-sm">
			<Heading size="xs">File Information</Heading>
			<div className="flex space-x-4">
				<Text size="sm" variant="muted">
					Size: {formatBytes(data.size)}
				</Text>
				<Text size="sm" variant="muted">
					Format: {data.extension?.toUpperCase()}
				</Text>
			</div>
			{data.hash && (
				<Text size="sm" variant="muted" title={data.hash || ''}>
					Hash: {formatHash(data.hash || '')}
				</Text>
			)}
			<Text size="sm" variant="muted" title={data.relativeLibraryPath}>
				Relative path: {data.relativeLibraryPath}
			</Text>
		</div>
	)
}
