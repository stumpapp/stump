import { cx } from '@stump/components'
import { ReadingDirection, ReadingMode } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback } from 'react'
import { useSwipeable } from 'react-swipeable'

import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { useEpubReaderContext, useEpubReaderControls } from '../context'
import ControlButton from './ControlButton'

type Props = {
	children: React.ReactNode
}

/**
 * Navigation chrome for the EPUB reader stage: desktop hover chevrons and mobile
 * edge/center tap zones. Everything here is positioned `absolute` relative to the
 * stage (this component's own root, which the caller sizes to `h-full w-full`), not
 * `fixed` to the viewport — so it tracks the actual reading pane instead of the window.
 */
export default function EpubNavigationControls({ children }: Props) {
	const { t } = useLocaleContext()
	const {
		readerMeta: { bookEntity: book },
	} = useEpubReaderContext()
	const {
		visible,
		setVisible,
		onPaginateBackward,
		onPaginateForward,
		canGoBackward,
		canGoForward,
	} = useEpubReaderControls()
	const {
		bookPreferences: { readingDirection, readingMode, tapSidesToNavigate },
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

	// canGoForward/canGoBackward are book-progression relative; map them to the physical
	// (left/right) chevrons, which are inverted under RTL.
	const canNavigateLeft = invertControls ? canGoForward !== false : canGoBackward !== false
	const canNavigateRight = invertControls ? canGoBackward !== false : canGoForward !== false

	const toggleControls = useCallback(() => setVisible(!visible), [setVisible, visible])

	/**
	 * A swipe handler to navigate forward or backward in the book.
	 *
	 * Note that the swipe handler function semantics are inverted wrt the reading direction.
	 * Attached to the stage wrapper itself (not an opaque overlay) so it does not steal clicks
	 * from the content below; the mobile tap zones below handle taps explicitly.
	 */
	const swipeHandlers = useSwipeable({
		onSwipedLeft: isVerticalScrolling ? undefined : onForwardNavigation,
		onSwipedRight: isVerticalScrolling ? undefined : onBackwardNavigation,
		onSwipedUp: isVerticalScrolling ? onForwardNavigation : undefined,
		onSwipedDown: isVerticalScrolling ? onBackwardNavigation : undefined,
		preventScrollOnSwipe: true,
	})

	return (
		<div className="min-h-0 relative h-full w-full flex-1" {...swipeHandlers}>
			{/* Desktop hover chevrons */}
			<div
				className={cx('inset-y-0 left-0 w-12 absolute z-20 hidden items-center', {
					'md:flex': true,
				})}
			>
				<ControlButton
					className={cx({ hidden: !visible })}
					onClick={onBackwardNavigation}
					disabled={!canNavigateLeft}
					aria-label={t('epubReader.controls.previousPage')}
				>
					<ChevronLeft className="h-5 w-5" />
				</ControlButton>
			</div>
			<div
				className={cx('inset-y-0 right-0 w-12 absolute z-20 hidden items-center justify-end', {
					'md:flex': true,
				})}
			>
				<ControlButton
					className={cx({ hidden: !visible })}
					onClick={onForwardNavigation}
					disabled={!canNavigateRight}
					aria-label={t('epubReader.controls.nextPage')}
				>
					<ChevronRight className="h-5 w-5" />
				</ControlButton>
			</div>

			{/*
		  Mobile tap zones. The wrapper is pointer-events-none so any unclaimed space
		  falls through to the content below; only the zone buttons themselves are
		  pointer-events-auto. This intentionally avoids one large opaque div that would
		  swallow every tap over the reading pane (links, text selection, etc.).
		*/}
			<div className="inset-0 md:hidden pointer-events-none absolute z-10 flex">
				{tapSidesToNavigate && (
					<button
						type="button"
						aria-label={t('epubReader.controls.previousPage')}
						disabled={!canNavigateLeft}
						onClick={onBackwardNavigation}
						className="pointer-events-auto h-full w-[15%] disabled:pointer-events-none"
					/>
				)}
				<button
					type="button"
					aria-label={t('epubReader.controls.toggleControls')}
					onClick={toggleControls}
					className="pointer-events-auto h-full flex-1"
				/>
				{tapSidesToNavigate && (
					<button
						type="button"
						aria-label={t('epubReader.controls.nextPage')}
						disabled={!canNavigateRight}
						onClick={onForwardNavigation}
						className="pointer-events-auto h-full w-[15%] disabled:pointer-events-none"
					/>
				)}
			</div>

			{children}
		</div>
	)
}
