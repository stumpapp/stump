import { cx } from '@stump/components'
import { ReadingDirection, ReadingMode } from '@stump/graphql'
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
		bookPreferences: { readingDirection, readingMode },
	} = useBookPreferences({ book })

	const invertControls = readingDirection === ReadingDirection.Rtl
	const isVerticalScrolling = readingMode === ReadingMode.ContinuousVertical

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
		onSwipedLeft: readingMode === ReadingMode.ContinuousVertical ? undefined : onForwardNavigation,
		onSwipedRight:
			readingMode === ReadingMode.ContinuousVertical ? undefined : onBackwardNavigation,
		onSwipedUp: readingMode === ReadingMode.ContinuousVertical ? onForwardNavigation : undefined,
		onSwipedDown: readingMode === ReadingMode.ContinuousVertical ? onBackwardNavigation : undefined,
		preventScrollOnSwipe: true,
	})

	return (
		<div className="gap-1 relative flex h-full w-full flex-1 items-center" aria-hidden="true">
			<div
				className={cx('left-2 w-12 md:flex fixed z-100 hidden h-1/2 items-center', {
					hidden: isVerticalScrolling,
				})}
			>
				<ControlButton className={cx({ hidden: !visible })} onClick={onBackwardNavigation}>
					<ChevronLeft className="h-5 w-5" />
				</ControlButton>
			</div>
			<div
				className="bottom-10 left-0 right-0 top-10 md:hidden fixed z-99"
				{...swipeHandlers}
				onClick={() => setVisible(false)}
			/>
			{children}
			<div
				className={cx('right-2 w-12 md:flex fixed z-100 hidden h-1/2 items-center justify-end', {
					hidden: isVerticalScrolling,
				})}
			>
				<ControlButton className={cx({ hidden: !visible })} onClick={onForwardNavigation}>
					<ChevronRight className="h-5 w-5" />
				</ControlButton>
			</div>
		</div>
	)
}
