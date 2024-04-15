import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn, IconButton, Text } from '@stump/components'
import { NavigationItem } from '@stump/types'
import { Eye, EyeOff } from 'lucide-react'
import React from 'react'

type Props = {
	item: NavigationItem
	active: boolean
	toggleActive: () => void
	disabled?: boolean
}

export default function NavigationArrangementItem({ item, active, toggleActive, disabled }: Props) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		disabled,
		id: item.type,
		transition: {
			duration: 250,
			easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
		},
	})

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	}

	const VisibilityIcon = active ? Eye : EyeOff

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			className={cn(
				'flex cursor-grab items-center justify-between rounded-md bg-background-300 outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
				{
					'cursor-not-allowed': disabled,
				},
				{
					'bg-opacity-50': !active,
				},
				{
					'cursor-grabbing': isDragging,
				},
			)}
		>
			<div className={cn('flex-1 shrink-0 py-4 pl-4', { 'opacity-60': !active })}>
				<Text size="sm">{item.type}</Text>
			</div>
			<div className="pr-4">
				<IconButton size="xs" disabled={disabled} onClick={toggleActive}>
					<VisibilityIcon className="h-4 w-4" />
				</IconButton>
			</div>
		</div>
	)
}
