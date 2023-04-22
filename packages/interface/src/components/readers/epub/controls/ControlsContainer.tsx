import { cx } from '@stump/components'

import { useEpubReaderControls } from '../context'

type Props = {
	children: React.ReactNode
	position: 'top' | 'bottom'
}
export default function ControlsContainer({ position, children }: Props) {
	const { visible, onMouseEnterControls, onMouseLeaveControls } = useEpubReaderControls()

	return (
		<div
			className={cx(
				'fixed z-[100] h-10 w-full',
				{
					'bottom-0': position === 'bottom',
				},
				{
					'top-0': position === 'top',
				},
			)}
			onMouseEnter={onMouseEnterControls}
			onMouseLeave={onMouseLeaveControls}
		>
			<div
				className={cx(
					'flex items-center gap-1 bg-white p-2 shadow-sm transition-opacity duration-150 dark:bg-gray-950 md:bg-transparent',
					visible ? 'opacity-100' : 'opacity-0',
				)}
			>
				{children}
			</div>
		</div>
	)
}
