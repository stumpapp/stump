import { getLibraryThumbnail } from '@stump/api'
import { EntityCard, Heading } from '@stump/components'
import type { Library } from '@stump/types'

import ReadMore from '../../components/ReadMore'
import TagList from '../../components/tags/TagList'

type Props = {
	isVisible: boolean
	library: Library
}
export default function LibraryOverviewTitleSection({ isVisible, library }: Props) {
	if (!isVisible) {
		return null
	}

	return (
		<div className="flex flex-1 items-start space-x-4 p-4">
			<EntityCard imageUrl={getLibraryThumbnail(library.id)} size="lg" fullWidth={false} />

			<div className="flex flex-1 flex-col gap-3">
				<div>
					<Heading size="sm">{library.name}</Heading>
				</div>

				<ReadMore text={library.description} />
				<TagList tags={library.tags} />
			</div>
		</div>
	)
}
