import { cx } from '@stump/components'

import { useEpubReaderControls } from '../context'

type Props = {
	children: React.ReactNode
	position: 'top' | 'bottom'
}
export default function ControlsContainer({ position, children }: Props) {
	const { visible, fullscreen, onMouseEnterControls, onMouseLeaveControls } =
		useEpubReaderControls()

	return (
		<div
			className={cx('z-[100] h-10 w-full', {
				'fixed bottom-0 left-0': position === 'bottom' && fullscreen,
				'fixed left-0 top-0': position === 'top' && fullscreen,
			})}
			onMouseEnter={onMouseEnterControls}
			onMouseLeave={onMouseLeaveControls}
			aria-hidden="true"
		>
			<div
				className={cx(
					'flex items-center gap-1 bg-white p-2 shadow-sm transition-opacity duration-150 dark:bg-gray-950 md:bg-transparent',
					{ 'opacity-100': !fullscreen || visible },
					{ 'opacity-0': !visible && fullscreen },
				)}
			>
				{children}
			</div>
		</div>
	)
}
