import { Link, Text } from '@stump/components'
import { motion } from 'framer-motion'
import { ArrowLeft, Fullscreen, Shrink } from 'lucide-react'
import { useMemo } from 'react'
import { useFullscreen } from 'rooks'

import paths from '@/paths'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useImageBaseReaderContext } from '../context'
import ControlButton from './ControlButton'
import SettingsDialog from './SettingsDialog'
import TimerMenu from './TimerMenu'

export default function ReaderHeader() {
	const { book } = useImageBaseReaderContext()
	const {
		settings: { showToolBar },
	} = useBookPreferences({ book })

	const { id, name, metadata } = book

	const title = useMemo(() => metadata?.title || name, [metadata, name])

	const { isFullscreenAvailable, isFullscreenEnabled, toggleFullscreen } = useFullscreen()

	const FullScreenIcon = isFullscreenEnabled ? Shrink : Fullscreen

	return (
		<motion.nav
			className="fixed left-0 top-0 z-[100] flex h-12 w-full items-center px-4 text-foreground"
			initial={false}
			animate={showToolBar ? 'visible' : 'hidden'}
			variants={transition}
			transition={{ duration: 0.2, ease: 'easeInOut' }}
		>
			<div className="flex w-full items-center justify-between">
				<div className="flex items-center space-x-4">
					<Link
						className="flex items-center text-foreground-on-black hover:text-foreground-on-black/80"
						title="Go to media overview"
						to={paths.bookOverview(id)}
					>
						<ArrowLeft size={'1.25rem'} />
					</Link>
				</div>

				<Text className="text-foreground-on-black">{title}</Text>

				<div className="flex items-center space-x-2">
					{isFullscreenAvailable && (
						<ControlButton onClick={toggleFullscreen}>
							<FullScreenIcon className="h-4 w-4" />
						</ControlButton>
					)}

					<TimerMenu />

					<SettingsDialog />
				</div>
			</div>
		</motion.nav>
	)
}

const transition = {
	hidden: {
		opacity: 0,
		transition: {
			duration: 0.2,
			ease: 'easeInOut',
		},
		y: '-100%',
	},
	visible: {
		opacity: 1,
		transition: {
			duration: 0.2,
			ease: 'easeInOut',
		},
		y: 0,
	},
}
