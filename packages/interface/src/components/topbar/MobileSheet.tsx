import { IconButton, Sheet } from '@stump/components'
import { Menu } from 'lucide-react'
import { useState } from 'react'

import { SidebarContent, SidebarHeader } from '../sidebar/Sidebar'

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
		>
			<div className="flex min-h-full shrink-0 flex-col gap-4 py-4">
				<SidebarContent isMobileSheet />
			</div>
		</Sheet>
	)
}
