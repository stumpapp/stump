import { formatBytes } from '@stump/client'
import { Heading, Text } from '@stump/components'
import { FragmentType, graphql, useFragment } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'

export const BookFileInformationFragment = graphql(`
	fragment BookFileInformation on Media {
		id
		size
		extension
		hash
		relativeLibraryPath
	}
`)

type Props = {
	fragment: FragmentType<typeof BookFileInformationFragment>
}

// TODO: redesign!!
export default function BookFileInformation({ fragment }: Props) {
	const { t } = useLocaleContext()
	const data = useFragment(BookFileInformationFragment, fragment)

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
		<div className="space-y-1 pb-3 pt-2 text-sm flex flex-col">
			<Heading size="xs">{t('bookOverviewScene.fileInformation.heading')}</Heading>
			<div className="space-x-4 flex">
				<Text size="sm" variant="muted">
					{t('bookOverviewScene.fileInformation.labels.fileSize')}: {formatBytes(data.size)}
				</Text>
				<Text size="sm" variant="muted">
					{t('bookOverviewScene.fileInformation.labels.fileType')}: {data.extension?.toUpperCase()}
				</Text>
			</div>
			{data.hash && (
				<Text size="sm" variant="muted" title={data.hash || ''}>
					{t('bookOverviewScene.fileInformation.labels.fileChecksum')}:{' '}
					{formatHash(data.hash || '')}
				</Text>
			)}
			<Text size="sm" variant="muted" title={data.relativeLibraryPath}>
				{t('bookOverviewScene.fileInformation.labels.fileLocation')}: {data.relativeLibraryPath}
			</Text>
		</div>
	)
}
