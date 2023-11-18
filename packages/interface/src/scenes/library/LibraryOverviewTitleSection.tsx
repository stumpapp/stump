import { getLibraryThumbnail } from '@stump/api'
import { EntityCard, Heading } from '@stump/components'
import type { Library } from '@stump/types'
import { useMediaMatch } from 'rooks'

import ReadMore from '@/components/ReadMore'
import TagList from '@/components/tags/TagList'

type Props = {
	library: Library
}
export default function LibraryOverviewTitleSection({ library }: Props) {
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const summary = library.description

	return (
		<div className="flex flex-col items-center gap-4 md:mb-2 md:flex-row md:items-start">
			<EntityCard
				imageUrl={getLibraryThumbnail(library.id)}
				isCover
				className="flex-auto flex-shrink-0"
			/>

			<div className="flex h-full w-full flex-col gap-2 md:gap-4">
				<div className="flex flex-col items-center text-center md:items-start md:text-left">
					<Heading size="sm">{library.name}</Heading>
					<TagList tags={library.tags} />
				</div>

				{isAtLeastMedium && !!summary && <ReadMore text={summary} />}
				{!isAtLeastMedium && !!summary && (
					<div>
						<Heading size="xs" className="mb-0.5">
							Summary
						</Heading>
						<ReadMore text={summary} />
					</div>
				)}
			</div>
		</div>
	)
}
