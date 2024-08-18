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
		<header className="sticky top-0 z-10 flex h-14 w-full shrink-0 border-b border-edge-subtle bg-sidebar px-4 md:hidden">
			<div className="grid w-full grid-cols-8 items-center gap-2">
				<div className="col-span-1">
					<MobileSheet />
				</div>
				<div className="col-span-6 flex h-full items-center justify-center gap-2">
					<Link to="/" className="flex shrink-0 items-center justify-start gap-2">
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
