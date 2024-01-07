import { IconButton } from '@stump/components'
import { Filter } from 'lucide-react'
import React from 'react'

// TODO: bottom drawer
export default function FilterBottomDrawer() {
	return (
		<IconButton variant="ghost">
			<Filter className="h-4 w-4 text-muted" />
		</IconButton>
	)
}
