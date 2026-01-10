import { cn, Spacer, Text } from '@stump/components'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import paths from '../../../paths'
import { useEpubReaderContext } from './context'
import {
	BookmarkToggle,
	ControlButton,
	ControlsContainer,
	FullScreenToggle,
	SearchCommand,
	ThemeControls,
} from './controls'
import { LocationManager } from './locations'

export default function EpubReaderHeader() {
	const {
		readerMeta: { bookEntity },
	} = useEpubReaderContext()
	const {
		bookPreferences: { fontFamily },
	} = useBookPreferences({ book: bookEntity })

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

			<Text
				size="sm"
				className={cn('line-clamp-1', {
					[`font-${fontFamily?.toLowerCase().replace(/_/g, '')}`]: !!fontFamily,
				})}
			>
				{bookEntity.resolvedName}
			</Text>

			<Spacer />

			<div className="flex items-center gap-x-2">
				<SearchCommand />
				<ThemeControls />
				<FullScreenToggle />
				<BookmarkToggle />
			</div>
		</ControlsContainer>
	)
}
