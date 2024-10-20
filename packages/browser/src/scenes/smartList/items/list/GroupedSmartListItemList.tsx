import { Accordion, cn, Text } from '@stump/components'
import { Library, Series, SmartListItemGroup } from '@stump/sdk'
import { useVirtualizer } from '@tanstack/react-virtual'
import pluralize from 'pluralize'
import { useCallback, useEffect, useMemo, useState } from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'

import { usePreferences } from '@/hooks'

import GroupedSmartListItemListGroupContent, {
	ACCORDION_CONTENT_ITEM_HEIGHT,
} from './GroupedSmartListItemListGroupContent'

const ACCORDION_GROUP_CLOSED_HEIGHT = 48

type AccordionItemMeta = {
	bookCount: number
	isOpen: boolean
}
type AccordionState = {
	[key: number]: AccordionItemMeta
}

type Props = {
	items: SmartListItemGroup<Series>[] | SmartListItemGroup<Library>[]
}
export default function GroupedSmartListItemList({ items }: Props) {
	const {
		preferences: { enable_hide_scrollbar },
	} = usePreferences()

	const [accordionState, setAccordionState] = useState<AccordionState>(() =>
		items
			.map((item, index) => ({
				[index]: {
					bookCount: item.books.length,
					isOpen: false,
				},
			}))
			.reduce((acc, curr) => ({ ...acc, ...curr }), {}),
	)

	const accordionValue = useMemo(
		() =>
			Object.entries(accordionState)
				.filter(([, { isOpen }]) => isOpen)
				.map(([key]) => key),
		[accordionState],
	)

	const handleAccordionChange = useCallback(
		(index: number) => {
			const accordionItem = accordionState[index]
			if (!accordionItem) {
				return
			}

			const { isOpen } = accordionItem
			setAccordionState((prev) => ({
				...prev,
				[index]: {
					...accordionItem,
					isOpen: !isOpen,
				},
			}))
		},
		[accordionState],
	)

	const estimateSize = useCallback(
		(index: number) => {
			const accordionItem = accordionState[index]
			if (!accordionItem) {
				return ACCORDION_GROUP_CLOSED_HEIGHT
			}

			const { bookCount, isOpen } = accordionItem
			if (!isOpen) {
				return ACCORDION_GROUP_CLOSED_HEIGHT
			}

			return (bookCount + 1) * ACCORDION_CONTENT_ITEM_HEIGHT
		},
		[accordionState],
	)

	const scrollRef = React.useRef<HTMLDivElement>(null)

	const groupVirtualizer = useVirtualizer({
		count: items.length,
		estimateSize,
		getScrollElement: () => scrollRef.current,
		overscan: 5,
	})

	const groupHeader = (groupedEntity: Series | Library) => groupedEntity.name

	useEffect(() => groupVirtualizer.measure(), [groupVirtualizer, accordionState])

	return (
		<div className="h-full w-full flex-1">
			<AutoSizer>
				{({ height, width }) => (
					<div
						ref={scrollRef}
						className={cn('overflow-y-auto overflow-x-hidden', {
							'scrollbar-hide': enable_hide_scrollbar,
						})}
						style={{
							height,
							width,
						}}
					>
						<div
							className="relative pr-4"
							style={{
								height: `${groupVirtualizer.getTotalSize()}px`,
								width,
							}}
						>
							<Accordion type="multiple" className="relative" value={accordionValue}>
								{groupVirtualizer.getVirtualItems().map(({ index, key, start, size }) => {
									const group = items[index]
									if (!group) {
										return null
									}

									const { entity, books } = group

									const positionFromTop = start + size
									const remainingSpace = height - positionFromTop

									return (
										<Accordion.Item
											key={key}
											value={index.toString()}
											style={{
												height: `${size}px`,
												left: 0,
												position: 'absolute',
												top: 0,
												transform: `translateY(${start}px)`,
												width: '100%',
											}}
										>
											<Accordion.Trigger onClick={() => handleAccordionChange(index)}>
												<div className="flex flex-1 items-center gap-x-12">
													<Text>{groupHeader(entity)}</Text>
													<Text size="sm" variant="muted">
														{books.length} {pluralize('book', books.length)}
													</Text>
												</div>
											</Accordion.Trigger>
											<GroupedSmartListItemListGroupContent
												books={books}
												maxHeight={remainingSpace}
											/>
										</Accordion.Item>
									)
								})}
							</Accordion>
						</div>
					</div>
				)}
			</AutoSizer>
		</div>
	)
}
