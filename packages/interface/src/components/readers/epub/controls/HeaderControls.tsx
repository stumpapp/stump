import { IconButton, Spacer, Text, ToolTip } from '@stump/components'
import { Album, ArrowLeft, Bookmark, TextSelection } from 'lucide-react'
import { Link } from 'react-router-dom'

import paths from '../../../../paths'
import { useEpubReaderContext } from '../context'
import ControlsContainer from './ControlsContainer'
import FontSelection from './FontSelection'
import TocDrawer from './TocDrawer'

export default function HeaderControls() {
	const { readerMeta } = useEpubReaderContext()

	return (
		<ControlsContainer>
			<div className="flex items-center">
				<ToolTip content="Book Overview" size="sm">
					<Link to={paths.bookOverview(readerMeta.bookEntity?.id || '')}>
						<IconButton variant="ghost" size="xs">
							<ArrowLeft className="h-5 w-5" />
						</IconButton>
					</Link>
				</ToolTip>

				{/* FIXME: replace this with button group once I make one :cringe: */}
				<div className="ml-4 flex items-center overflow-hidden rounded-md dark:bg-gray-800">
					<TocDrawer />

					<ToolTip content="Bookmarks" size="sm">
						<IconButton variant="ghost" size="xs" rounded="none" pressEffect={false} disabled>
							<Album className="h-5 w-5" />
						</IconButton>
					</ToolTip>

					<ToolTip content="Annotations" size="sm">
						<IconButton variant="ghost" size="xs" rounded="none" pressEffect={false} disabled>
							<TextSelection className="h-5 w-5" />
						</IconButton>
					</ToolTip>
				</div>
			</div>

			<Spacer />

			<div className="flex flex-col text-center">
				<Text size="sm" className="line-clamp-1">
					{readerMeta.bookEntity?.name}
				</Text>
				{readerMeta.bookMeta?.chapter && (
					<Text size="sm" className="line-clamp-1">
						{readerMeta.bookMeta?.chapter.name}
					</Text>
				)}
			</div>

			<Spacer />

			<div className="flex items-center">
				<IconButton variant="ghost" size="xs" disabled>
					<Bookmark className="h-5 w-5" />
				</IconButton>

				<FontSelection />
			</div>
		</ControlsContainer>
	)
}
