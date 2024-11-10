import { cn, Dropdown, IconButton } from '@stump/components'
import { WandSparkles } from 'lucide-react'
import React from 'react'

import { useFilterStore } from './store'

export default function SmartSearchButton() {
	const { filterMode, setMode } = useFilterStore((state) => ({
		filterMode: state.mode,
		setMode: state.setMode,
	}))

	return (
		<Dropdown modal={false}>
			<Dropdown.Trigger asChild>
				<IconButton
					variant="ghost"
					size="xs"
					className={cn('hover:bg-fill-brand-secondary', {
						'bg-fill-brand-secondary text-fill-brand': filterMode === 'body',
					})}
					pressEffect={false}
				>
					<WandSparkles className="h-4 w-4" />
				</IconButton>
			</Dropdown.Trigger>
			<Dropdown.Content align="end">
				<Dropdown.Group>
					<Dropdown.Item
						onClick={() => setMode(filterMode === 'body' ? 'url' : 'body')}
						className="rounded-lg px-2 py-1.5 text-sm"
					>
						<span>{filterMode === 'body' ? 'Exit' : 'Enter'} smart search</span>
					</Dropdown.Item>
					<Dropdown.Item disabled={filterMode === 'url'} className="rounded-lg px-2 py-1.5 text-sm">
						<span>Save as list</span>
					</Dropdown.Item>
				</Dropdown.Group>
			</Dropdown.Content>
		</Dropdown>
	)
}
