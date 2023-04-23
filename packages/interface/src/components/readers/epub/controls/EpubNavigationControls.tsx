import { Button, cx } from '@stump/components'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useSwipeable } from 'react-swipeable'

import { useEpubReaderControls } from '../context'

type Props = {
	children: React.ReactNode
}
export default function EpubNavigationControls({ children }: Props) {
	const {
		visible,
		onMouseEnterControls,
		onMouseLeaveControls,
		onPaginateBackward,
		onPaginateForward,
		setVisible,
	} = useEpubReaderControls()

	const swipeHandlers = useSwipeable({
		onSwipedLeft: onPaginateBackward,
		onSwipedRight: onPaginateForward,
		preventScrollOnSwipe: true,
	})

	return (
		<div className="relative flex h-full w-full items-center gap-1">
			<div
				className="fixed left-2 z-[100] hidden h-1/2 w-12 items-center md:flex"
				onMouseEnter={onMouseEnterControls}
				onMouseLeave={onMouseLeaveControls}
			>
				<Button
					size="sm"
					className={cx({ hidden: !visible })}
					variant="ghost"
					onClick={onPaginateBackward}
				>
					<ChevronLeft className="h-5 w-5" />
				</Button>
			</div>
			<div
				className="fixed inset-0 z-[99] md:hidden"
				{...swipeHandlers}
				onClick={() => setVisible(false)}
			/>
			{children}
			<div
				className="fixed right-2 z-[100] hidden h-1/2 w-12 items-center justify-end md:flex"
				onMouseEnter={onMouseEnterControls}
				onMouseLeave={onMouseLeaveControls}
			>
				<Button
					size="sm"
					className={cx({ hidden: !visible })}
					variant="ghost"
					onClick={onPaginateForward}
				>
					<ChevronRight className="h-5 w-5" />
				</Button>
			</div>
		</div>
	)
}
