import { Spacer, Text } from '@stump/components'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import paths from '../../../paths'
import { useEpubReaderContext } from './context'
import {
	BookmarkToggle,
	ControlButton,
	ControlsContainer,
	FullScreenToggle,
	ThemeControls,
} from './controls'
import { LocationManager } from './locations'

export default function EpubReaderHeader() {
	const {
		readerMeta: { bookEntity },
	} = useEpubReaderContext()

	const bookName = bookEntity?.metadata?.title || bookEntity?.name || ''

	return (
		<ControlsContainer position="top">
			<div className="flex items-center gap-x-2">
				<Link to={paths.bookOverview(bookEntity?.id || '')} title="Book Overview">
					<ControlButton>
						<ArrowLeft className="h-4 w-4" />
					</ControlButton>
				</Link>

				<LocationManager />
			</div>

			<Spacer />

			<Text size="sm" className="line-clamp-1">
				{bookName}
			</Text>

			<Spacer />

			<div className="flex items-center gap-x-2">
				<ThemeControls />
				<FullScreenToggle />
				<BookmarkToggle />
			</div>
		</ControlsContainer>
	)
}
