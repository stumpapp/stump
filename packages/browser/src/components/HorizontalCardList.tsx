import { Button, cn, Heading, Text, ToolTip } from '@stump/components'
import { ChevronLeft, ChevronRight, CircleSlash2 } from 'lucide-react'
import { forwardRef, useMemo } from 'react'
import { ScrollerProps, Virtuoso } from 'react-virtuoso'
import { useMediaMatch } from 'rooks'

import { useHorizontalScroll, usePreferences } from '../hooks'

type Props = {
	title: string
	items: React.ReactElement[]
	onFetchMore: () => void
	emptyState?: React.ReactNode
	height?: number
	footerHeight?: number
}

export default function HorizontalCardList({
	title,
	items,
	onFetchMore,
	emptyState,
	height: heightProp,
	footerHeight = 96,
}: Props) {
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

	const { scrollerRef, canSkipBackward, canSkipForward, handleSkipBackward, handleSkipAhead } =
		useHorizontalScroll()

	const isAtLeastSmall = useMediaMatch('(min-width: 640px)')
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const calculatedHeight = useMemo(() => {
		const imageWidth = !isAtLeastSmall ? 160 : !isAtLeastMedium ? 170.656 : 192 // widths from EntityCard
		const imageHeight = imageWidth / thumbnailRatio

		return imageHeight + footerHeight
	}, [isAtLeastSmall, isAtLeastMedium, thumbnailRatio, footerHeight])

	const height = heightProp ?? calculatedHeight

	const renderContent = () => {
		if (!items.length) {
			return (
				<div className="flex">
					{emptyState || (
						<div className="flex items-start justify-start space-x-3 rounded-lg border border-dashed border-edge-subtle px-4 py-4">
							<span className="rounded-lg border border-edge bg-background-surface p-2">
								<CircleSlash2 className="h-8 w-8 text-foreground-muted" />
							</span>
							<div>
								<Text>Nothing to show</Text>
								<Text size="sm" variant="muted">
									No results present to display
								</Text>
							</div>
						</div>
					)}
				</div>
			)
		} else {
			return (
				<Virtuoso
					scrollerRef={scrollerRef}
					style={{ height }}
					horizontalDirection
					data={items}
					components={{
						Scroller: HorizontalScroller,
					}}
					itemContent={(_, card) => <div className="px-1.5">{card}</div>}
					endReached={onFetchMore}
					increaseViewportBy={5 * (height / 3)}
					overscan={{ main: 3, reverse: 3 }}
				/>
			)
		}
	}

	return (
		<div className="flex flex-col space-y-2">
			<div className="flex flex-row items-center justify-between">
				<Heading size="sm">{title}</Heading>
				<div className={cn('self-end', { hidden: !items.length })}>
					<div className="flex gap-2">
						<ToolTip content="Seek backwards" isDisabled={!canSkipBackward} align="end">
							<Button
								variant="ghost"
								size="icon"
								disabled={!canSkipBackward}
								onClick={handleSkipBackward}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
						</ToolTip>
						<ToolTip content="Seek Ahead" isDisabled={!canSkipForward} align="end">
							<Button
								variant="ghost"
								size="icon"
								disabled={!canSkipForward}
								onClick={handleSkipAhead}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</ToolTip>
					</div>
				</div>
			</div>

			{renderContent()}
		</div>
	)
}

const HorizontalScroller = forwardRef<HTMLDivElement, ScrollerProps>(
	({ children, ...props }, ref) => {
		const {
			preferences: { enableHideScrollbar },
		} = usePreferences()

		return (
			<div
				className={cn('flex overflow-y-hidden', {
					'scrollbar-hide': enableHideScrollbar,
				})}
				ref={ref}
				{...props}
			>
				{children}
			</div>
		)
	},
)
HorizontalScroller.displayName = 'HorizontalScroller'
