import { IconButton, Sheet } from '@stump/components'
import { Menu } from 'lucide-react'
import { useState } from 'react'

import { SidebarContent, SidebarFooter, SidebarHeader } from '../sidebar/Sidebar'

export default function MobileSheet() {
	const [open, setOpen] = useState(false)

	return (
		<Sheet
			size="xl"
			title={<SidebarHeader />}
			trigger={
				<IconButton variant="ghost" onClick={() => setOpen(true)}>
					<Menu className="h-5 w-5" />
				</IconButton>
			}
			floating
			rounded
			open={open}
			onOpen={() => setOpen(true)}
			onClose={() => setOpen(false)}
			footer={<SidebarFooter />}
		>
			<div className="flex-1 px-6">
				<SidebarContent isMobileSheet />
			</div>
		</Sheet>
	)
}
