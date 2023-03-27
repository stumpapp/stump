import { Heading, IconButton } from '@stump/components'
import { Menu } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function TopBar() {
	return (
		<header className="sticky top-0 z-10 w-full border-b border-gray-50 bg-gray-50/20 px-4 py-2 dark:border-gray-900 dark:bg-gray-1000/90 md:hidden">
			<div className="grid grid-cols-8 items-center gap-2">
				<div className="col-span-1">
					<IconButton variant="ghost" onClick={() => alert('TODO lol')}>
						<Menu className="h-5 w-5" />
					</IconButton>
				</div>
				<div className="col-span-6 flex items-center justify-center gap-2">
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
