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
			className={cx('h-10 w-full shrink-0', {
				'bottom-0 left-0': position === 'bottom' && fullscreen,
				'fixed z-[100]': fullscreen,
				'left-0 top-0': position === 'top' && fullscreen,
			})}
			onMouseEnter={onMouseEnterControls}
			onMouseLeave={onMouseLeaveControls}
			aria-hidden="true"
		>
			<div
				className={cx(
					'flex h-full items-center gap-1 bg-white p-2 transition-opacity duration-150 dark:bg-gray-1000 md:bg-transparent',
					{ 'opacity-100': !fullscreen || visible },
					{ 'opacity-0': !visible && fullscreen },
				)}
			>
				{children}
			</div>
		</div>
	)
}
