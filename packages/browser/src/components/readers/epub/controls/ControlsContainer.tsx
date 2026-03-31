import { cn } from '@stump/components'

import { useEpubReaderControls } from '../context'

type Props = {
	children: React.ReactNode
	position: 'top' | 'bottom'
	className?: string
}
export default function ControlsContainer({ position, children, className }: Props) {
	const { visible, fullscreen, onMouseEnterControls, onMouseLeaveControls } =
		useEpubReaderControls()

	return (
		<div
			className={cn(
				'h-10 w-full shrink-0',
				{
					'bottom-0 left-0': position === 'bottom' && fullscreen,
					'fixed z-100': fullscreen,
					'left-0 top-0': position === 'top' && fullscreen,
				},
				className,
			)}
			onMouseEnter={onMouseEnterControls}
			onMouseLeave={onMouseLeaveControls}
			aria-hidden="true"
		>
			<div
				className={cn(
					'gap-1 px-2 flex h-full items-center bg-background transition-opacity duration-150',
					{ 'md:bg-transparent': !fullscreen },
					{ 'opacity-100': !fullscreen || visible },
					{ 'opacity-0': !visible && fullscreen },
					position === 'bottom' ? 'py-1' : 'py-2',
				)}
			>
				{children}
			</div>
		</div>
	)
}
