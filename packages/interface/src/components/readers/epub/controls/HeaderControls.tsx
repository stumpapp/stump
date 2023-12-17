import { Spacer, Text } from '@stump/components'
import { ArrowLeft, Bookmark, List } from 'lucide-react'
import { Link } from 'react-router-dom'

import paths from '../../../../paths'
import { useEpubReaderContext } from '../context'
import ControlButton from './ControlButton'
import ControlsContainer from './ControlsContainer'
import FullScreenToggle from './FullScreenToggle'
import ThemeControls from './ThemeControls'

export default function HeaderControls() {
	const { readerMeta } = useEpubReaderContext()

	const bookName = readerMeta.bookEntity?.name || ''

	return (
		<ControlsContainer position="top">
			<div className="flex items-center gap-x-2">
				<Link to={paths.bookOverview(readerMeta.bookEntity?.id || '')} title="Book Overview">
					<ControlButton>
						<ArrowLeft className="h-4 w-4" />
					</ControlButton>
				</Link>

				<ControlButton>
					<List className="h-4 w-4" />
				</ControlButton>
			</div>

			<Spacer />

			<Text size="sm" className="line-clamp-1">
				{bookName}
			</Text>

			<Spacer />

			<div className="flex items-center gap-x-2">
				<ThemeControls />

				<FullScreenToggle />

				<ControlButton disabled>
					<Bookmark className="h-4 w-4" />
				</ControlButton>
			</div>
		</ControlsContainer>
	)
}
