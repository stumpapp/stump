import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CheckBox, cn, IconButton, Text } from '@stump/components'
import {
	FilterableArrangementEntityLink,
	NavigationArrangementQuery,
	SystemArrangement,
} from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { Bolt, Eye, EyeOff } from 'lucide-react'
import { useCallback, useState } from 'react'

import { getSectionId } from './NavigationArrangement'

type Section =
	NavigationArrangementQuery['me']['preferences']['navigationArrangement']['sections'][number]

type Props = {
	/**
	 * The navigation item to render
	 */
	section: Section

	/**
	 * A callback to toggle the visibility of the item
	 */
	onChangeVisibility: () => void
	/**
	 * A callback to change the options of an entity item
	 */
	onChangeLinks: (links: FilterableArrangementEntityLink[]) => void
	/**
	 * Whether the item is disabled, and cannot be interacted with. This is used to
	 * lock items in place and prevent accidental reordering.
	 */
	disabled?: boolean
	/**
	 * Whether the item is hidden from view. This is used to hide items that are not
	 * accessible to the user due to permissions.
	 */
	hidden?: boolean
}

export default function NavigationArrangementItem({
	section,
	onChangeVisibility,
	onChangeLinks,
	disabled,
	hidden,
}: Props) {
	const { t } = useLocaleContext()
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		disabled,
		id: getSectionId(section),
		transition: {
			duration: 250,
			easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
		},
	})

	const [showConfiguration, setShowConfiguration] = useState(false)

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	}

	const VisibilityIcon = section.visible ? Eye : EyeOff

	const createCheckboxHandler = useCallback(
		(link: FilterableArrangementEntityLink) => () => {
			if (section.config.__typename !== 'SystemArrangementConfig') return

			const updatedLinks = section.config.links.includes(link)
				? section.config.links.filter((l) => l !== link)
				: [...section.config.links, link]

			onChangeLinks(updatedLinks)
		},
		[section.config, onChangeLinks],
	)

	if (hidden) {
		return null
	}

	if (section.config.__typename !== 'SystemArrangementConfig') {
		console.warn('I have not implemented the UI for custom arrangements yet. Sorry <3')
		return null
	}

	const isConfigurableSection = ![SystemArrangement.Home, SystemArrangement.Explore].includes(
		section.config.variant,
	)

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			className={cn(
				'flex cursor-grab flex-col rounded-md bg-background-surface-secondary/80 outline-none focus-visible:ring-2 focus-visible:ring-edge-brand',
				{
					'cursor-not-allowed': disabled,
				},
				{
					'bg-opacity-50': !section.visible,
				},
				{
					'cursor-grabbing': isDragging,
				},
			)}
		>
			<div className="flex items-center justify-between">
				<div className={cn('flex-1 shrink-0 py-4 pl-4', { 'opacity-60': !section.visible })}>
					<Text size="sm">{t(getItemKey(section.config.variant))}</Text>
				</div>
				<div className="flex items-center space-x-2 pr-4">
					{isConfigurableSection && (
						<IconButton
							size="xs"
							disabled={disabled}
							onClick={() => setShowConfiguration(!showConfiguration)}
						>
							<Bolt className="h-4 w-4" />
						</IconButton>
					)}
					<IconButton size="xs" disabled={disabled} onClick={onChangeVisibility}>
						<VisibilityIcon className="h-4 w-4" />
					</IconButton>
				</div>
			</div>

			{isConfigurableSection && showConfiguration && (
				<div className="flex flex-wrap items-center gap-3 p-4">
					<CheckBox
						variant="primary"
						label={t(getConfigKey('createAction.label'))}
						checked={section.config.links.includes(FilterableArrangementEntityLink.Create)}
						onClick={createCheckboxHandler(FilterableArrangementEntityLink.Create)}
					/>

					<CheckBox
						variant="primary"
						label={t(getConfigKey('linkToAll.label'))}
						checked={section.config.links.includes(FilterableArrangementEntityLink.ShowAll)}
						onClick={createCheckboxHandler(FilterableArrangementEntityLink.ShowAll)}
					/>
				</div>
			)}
		</div>
	)
}

const LOCALE_BASE = 'settingsScene.app/preferences.sections.navigationArrangement'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
const getItemKey = (key: string) => getKey(`options.${key}`)
const getConfigKey = (key: string) => getKey(`entityOptions.${key}`)
