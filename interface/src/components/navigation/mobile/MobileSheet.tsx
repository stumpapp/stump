import { IconButton, Sheet } from '@stump/components'
import { Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useMediaMatch } from 'rooks'

import UserMenu from '../../UserMenu'
import { SideBar, SideBarFooter } from '../sidebar'

export default function MobileSheet() {
	const [open, setOpen] = useState(false)

	const isMobile = useMediaMatch('(max-width: 768px)')

	useEffect(() => {
		if (!isMobile) setOpen(false)
	}, [isMobile])

	return (
		<Sheet
			size="xl"
			title={<UserMenu />}
			trigger={
				<IconButton variant="ghost" onClick={() => setOpen(true)}>
					<Menu className="h-5 w-5" />
				</IconButton>
			}
			open={open}
			onOpen={() => setOpen(true)}
			onClose={() => setOpen(false)}
			footer={
				<div className="w-full pb-2">
					<SideBarFooter />
				</div>
			}
			closeIcon={false}
			position="left"
		>
			<div className="flex-1 overflow-y-scroll px-6">
				<SideBar asChild />
			</div>
		</Sheet>
	)
}
