import { Heading } from '@stump/components'
import { Link } from 'react-router-dom'

import MobileSheet from './MobileSheet'

export const TOPBAR_HEIGHT_PX = 53

/**
 * The top bar of Stump, only visible on mobile. This is mostly because many scenes
 * have their own topbar, and they are too different from each other to be generalized
 * into a single component like this one.
 */
export default function TopBar() {
	return (
		<header className="top-0 h-14 px-4 md:hidden sticky z-10 flex w-full shrink-0 border-b border-edge-subtle bg-sidebar">
			<div className="gap-2 grid w-full grid-cols-8 items-center">
				<div className="col-span-1">
					<MobileSheet />
				</div>
				<div className="gap-2 col-span-6 flex h-full items-center justify-center">
					<Link to="/" className="gap-2 flex shrink-0 items-center justify-start">
						<img src="/assets/favicon.ico" className="h-6 w-6 object-scale-down" />
						<Heading variant="gradient" size="xs">
							Stump
						</Heading>
					</Link>
				</div>
				<div className="col-span-1" />
			</div>
		</header>
	)
}
