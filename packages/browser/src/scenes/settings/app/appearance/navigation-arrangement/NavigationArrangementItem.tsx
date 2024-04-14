import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn, IconButton } from '@stump/components'
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
				'flex cursor-grab items-center justify-between bg-background-300',
				{
					'cursor-not-allowed': disabled,
				},
				{
					'cursor-grabbing': isDragging,
				},
			)}
		>
			<span className="flex-1 shrink-0 py-4 pl-4">{item.type}</span>
			<div className="pr-4">
				<IconButton size="xs" disabled={disabled} onClick={toggleActive}>
					<VisibilityIcon className="h-4 w-4" />
				</IconButton>
			</div>
		</div>
	)
}
