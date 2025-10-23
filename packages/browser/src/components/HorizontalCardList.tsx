import { Button, cn, Heading, Text, ToolTip } from '@stump/components'
import { ChevronLeft, ChevronRight, CircleSlash2 } from 'lucide-react'
import { forwardRef, useCallback, useMemo, useRef, useState } from 'react'
import { ScrollerProps, Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import { useInViewRef, useMediaMatch } from 'rooks'

import { usePreferences } from '../hooks'

type Props = {
	title: string
	items: React.ReactElement[]
	onFetchMore: () => void
	emptyState?: React.ReactNode
}

export default function HorizontalCardList({ title, items, onFetchMore, emptyState }: Props) {
	const {
		preferences: { thumbnailRatio },
	} = usePreferences()

	const virtuosoRef = useRef<VirtuosoHandle>(null)

	const isAtLeastSmall = useMediaMatch('(min-width: 640px)')
	const isAtLeastMedium = useMediaMatch('(min-width: 768px)')

	const height = useMemo(() => {
		const imageWidth = !isAtLeastSmall ? 160 : !isAtLeastMedium ? 170.656 : 192 // widths from EntityCard
		const imageHeight = imageWidth / thumbnailRatio
		const footerHeight = 96 // estimated height of footer

		return imageHeight + footerHeight
	}, [isAtLeastSmall, isAtLeastMedium, thumbnailRatio])

	const [firstCardRef, firstCardIsInView] = useInViewRef({ threshold: 0.5 })
	const [lastCardRef, lastCardIsInView] = useInViewRef({ threshold: 0.5 })
	const [visibleRange, setVisibleRange] = useState({
		endIndex: 0,
		startIndex: 0,
	})

	const { startIndex: lowerBound, endIndex: upperBound } = visibleRange

	const canSkipBackward = upperBound > 0 && !firstCardIsInView
	const canSkipForward = items.length && !lastCardIsInView

	const handleSkipAhead = useCallback(
		(skip = 5) => {
			const nextIndex = Math.min(upperBound + skip, items.length - 1)
			virtuosoRef.current?.scrollIntoView({
				index: nextIndex,
				behavior: 'smooth',
				align: 'start',
			})
		},
		[upperBound, items.length],
	)

	const handleSkipBackward = useCallback(
		(skip = 5) => {
			const nextIndex = Math.max(lowerBound - skip, 0)
			virtuosoRef.current?.scrollIntoView({
				index: nextIndex,
				behavior: 'smooth',
				align: 'start',
			})
		},
		[lowerBound],
	)

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
					ref={virtuosoRef}
					style={{ height }}
					horizontalDirection
					data={items}
					components={{
						Scroller: HorizontalScroller,
					}}
					itemContent={(idx, card) => (
						<div
							{...(idx === 0
								? { ref: firstCardRef }
								: idx === items.length - 1
									? { ref: lastCardRef }
									: {})}
							className="px-1"
						>
							{card}
						</div>
					)}
					endReached={onFetchMore}
					increaseViewportBy={5 * (height / 3)}
					rangeChanged={setVisibleRange}
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
								onClick={() => handleSkipBackward()}
								onDoubleClick={() => handleSkipBackward(20)}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
						</ToolTip>
						<ToolTip content="Seek Ahead" isDisabled={!canSkipForward} align="end">
							<Button
								variant="ghost"
								size="icon"
								disabled={!canSkipForward}
								onClick={() => handleSkipAhead()}
								onDoubleClick={() => handleSkipAhead(20)}
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
