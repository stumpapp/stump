import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn, IconButton, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { NavigationItem } from '@stump/types'
import { Bolt, Eye, EyeOff } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import EntityOptions from './EntityOptions'
import { IEntityOptions, isNavigationItemWithEntityOptions } from './types'

type Props = {
	item: NavigationItem
	active: boolean
	toggleActive: () => void
	onChangeOptions: (options: IEntityOptions) => void
	disabled?: boolean
}

export default function NavigationArrangementItem({
	item,
	active,
	toggleActive,
	onChangeOptions,
	disabled,
}: Props) {
	const { t } = useLocaleContext()
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

	const entityOptions = useMemo(
		() => (isNavigationItemWithEntityOptions(item) ? item : null),
		[item],
	)
	const [entityOptionsOpen, setEntityOptionsOpen] = useState(false)

	const VisibilityIcon = active ? Eye : EyeOff

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			className={cn(
				'flex cursor-grab flex-col rounded-md bg-background-300 outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
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
			<div className="flex items-center justify-between">
				<div className={cn('flex-1 shrink-0 py-4 pl-4', { 'opacity-60': !active })}>
					<Text size="sm">{t(getItemKey(item.type))}</Text>
				</div>
				<div className="flex items-center space-x-2 pr-4">
					{entityOptions && (
						<IconButton
							size="xs"
							disabled={disabled}
							onClick={() => setEntityOptionsOpen(!entityOptionsOpen)}
						>
							<Bolt className="h-4 w-4" />
						</IconButton>
					)}
					<IconButton size="xs" disabled={disabled} onClick={toggleActive}>
						<VisibilityIcon className="h-4 w-4" />
					</IconButton>
				</div>
			</div>

			{entityOptions && (
				<EntityOptions
					isOpen={!disabled && entityOptionsOpen}
					options={entityOptions}
					onChange={onChangeOptions}
				/>
			)}
		</div>
	)
}

const LOCALE_BASE = 'settingsScene.app/appearance.sections.navigationArrangement'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
const getItemKey = (key: string) => getKey(`options.${key}`)
