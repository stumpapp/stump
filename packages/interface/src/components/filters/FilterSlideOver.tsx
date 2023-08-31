import { Button, Sheet } from '@stump/components'
import { Filter } from 'lucide-react'
import React, { useState } from 'react'
import { useMediaMatch } from 'rooks'

import { useFilterContext } from './context'

type Props = {
	prompt?: string
}
export default function FilterSlideOver({ prompt }: Props) {
	const { filters } = useFilterContext()

	const [isOpen, setIsOpen] = useState(false)
	const isMobile = useMediaMatch('(max-width: 768px)')

	const nonSearchFilterCount = Object.keys(filters || {}).length - (filters?.search ? 1 : 0)

	return (
		<Sheet
			open={isOpen}
			onClose={() => setIsOpen(false)}
			onOpen={() => setIsOpen(true)}
			title="Filter options"
			description={prompt || 'Use the options below to narrow your search'}
			trigger={
				<Button variant="ghost" className="flex h-full items-center gap-1.5">
					<Filter className="h-4 w-4" />
					<span>Filter</span>
					<span className="text-brand">({nonSearchFilterCount})</span>
				</Button>
			}
			size={isMobile ? 'xl' : 'default'}
		>
			<div className="flex max-h-full flex-col gap-1 overflow-y-auto px-2 pt-4 scrollbar-hide">
				Woah!
			</div>
		</Sheet>
	)
}
