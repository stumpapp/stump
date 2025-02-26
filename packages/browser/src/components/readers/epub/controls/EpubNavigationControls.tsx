import { cx } from '@stump/components'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback } from 'react'
import { useSwipeable } from 'react-swipeable'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useEpubReaderContext, useEpubReaderControls } from '../context'
import ControlButton from './ControlButton'

type Props = {
	children: React.ReactNode
}

export default function EpubNavigationControls({ children }: Props) {
	const {
		readerMeta: { bookEntity: book },
	} = useEpubReaderContext()
	const { visible, onPaginateBackward, onPaginateForward, setVisible } = useEpubReaderControls()
	const {
		bookPreferences: { readingDirection },
	} = useBookPreferences({ book })

	const invertControls = readingDirection === 'rtl'

	/**
	 * A callback to navigate backward in the book, wrt the natural reading
	 * progression direction.
	 *
	 * If the reading direction is RTL, then the backward navigation is actually
	 * forward in the book.
	 */
	const onBackwardNavigation = useCallback(() => {
		if (invertControls) {
			onPaginateForward()
		} else {
			onPaginateBackward()
		}
	}, [invertControls, onPaginateBackward, onPaginateForward])

	/**
	 * A callback to navigate forward in the book, wrt the natural reading
	 * progression direction.
	 *
	 * If the reading direction is RTL, then the forward navigation is actually
	 * backwards in the book.
	 */
	const onForwardNavigation = useCallback(() => {
		if (invertControls) {
			onPaginateBackward()
		} else {
			onPaginateForward()
		}
	}, [invertControls, onPaginateBackward, onPaginateForward])

	/**
	 * A swipe handler to navigate forward or backward in the book.
	 *
	 * Note that the swipe handler function semantics are inverted wrt the reading direction.
	 */
	const swipeHandlers = useSwipeable({
		onSwipedLeft: onForwardNavigation,
		onSwipedRight: onBackwardNavigation,
		preventScrollOnSwipe: true,
	})

	return (
		<div className="relative flex h-full w-full flex-1 items-center gap-1" aria-hidden="true">
			<div className="fixed left-2 z-[100] hidden h-1/2 w-12 items-center md:flex">
				<ControlButton className={cx({ hidden: !visible })} onClick={onBackwardNavigation}>
					<ChevronLeft className="h-5 w-5" />
				</ControlButton>
			</div>
			<div
				className="fixed bottom-10 left-0 right-0 top-10 z-[99] md:hidden"
				{...swipeHandlers}
				onClick={() => setVisible(false)}
			/>
			{children}
			<div className="fixed right-2 z-[100] hidden h-1/2 w-12 items-center justify-end md:flex">
				<ControlButton className={cx({ hidden: !visible })} onClick={onForwardNavigation}>
					<ChevronRight className="h-5 w-5" />
				</ControlButton>
			</div>
		</div>
	)
}
