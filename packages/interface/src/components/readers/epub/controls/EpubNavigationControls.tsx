import { useEpubReader } from '@stump/client'
import { cx } from '@stump/components'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback } from 'react'
import { useSwipeable } from 'react-swipeable'

import { useEpubReaderControls } from '../context'
import ControlButton from './ControlButton'

type Props = {
	children: React.ReactNode
}
export default function EpubNavigationControls({ children }: Props) {
	const { visible, onPaginateBackward, onPaginateForward, setVisible } = useEpubReaderControls()

	const { readingDirection } = useEpubReader((state) => ({
		readingDirection: state.preferences.readingDirection,
	}))

	const invertControls = readingDirection === 'rtl'

	const onLeftNavigate = useCallback(() => {
		if (invertControls) {
			onPaginateForward()
		} else {
			onPaginateBackward()
		}
	}, [invertControls, onPaginateBackward, onPaginateForward])

	const onRightNavigate = useCallback(() => {
		if (invertControls) {
			onPaginateBackward()
		} else {
			onPaginateForward()
		}
	}, [invertControls, onPaginateBackward, onPaginateForward])

	const swipeHandlers = useSwipeable({
		onSwipedLeft: onLeftNavigate,
		onSwipedRight: onRightNavigate,
		preventScrollOnSwipe: true,
	})

	return (
		<div className="relative flex h-full w-full flex-1 items-center gap-1" aria-hidden="true">
			<div className="fixed left-2 z-[100] hidden h-1/2 w-12 items-center md:flex">
				<ControlButton className={cx({ hidden: !visible })} onClick={onLeftNavigate}>
					<ChevronLeft className="h-5 w-5" />
				</ControlButton>
			</div>
			<div
				className="fixed inset-0 z-[99] md:hidden"
				{...swipeHandlers}
				onClick={() => setVisible(false)}
			/>
			{children}
			<div className="fixed right-2 z-[100] hidden h-1/2 w-12 items-center justify-end md:flex">
				<ControlButton className={cx({ hidden: !visible })} onClick={onRightNavigate}>
					<ChevronRight className="h-5 w-5" />
				</ControlButton>
			</div>
		</div>
	)
}
