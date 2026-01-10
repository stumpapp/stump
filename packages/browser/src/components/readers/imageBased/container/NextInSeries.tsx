import { Button, ButtonOrLink, cn, HoverCard, Label, Popover, Text } from '@stump/components'
import { ReadingDirection } from '@stump/graphql'
import { ArrowRight, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useMediaMatch } from 'rooks'

import { EntityImage } from '@/components/entity'
import { usePaths } from '@/paths'
import { useBookPreferences } from '@/scenes/book/reader/useBookPreferences'

import { NextInSeriesBookRef, useImageBaseReaderContext } from '../context'

export default function NextInSeries() {
	const [isHidden, setIsHidden] = useState(false)

	const { book, currentPage } = useImageBaseReaderContext()
	const {
		bookPreferences: { readingDirection },
	} = useBookPreferences({ book })

	const paths = usePaths()
	const isMobile = useMediaMatch('(max-width: 640px)')

	const nextInSeries = useMemo(() => {
		const next = book.nextInSeries.nodes.at(0)
		if (!next) return null
		return {
			id: next.id,
			name: next.name,
			thumbnailUrl: next.thumbnail.url,
		} satisfies NextInSeriesBookRef
	}, [book.nextInSeries.nodes])

	if (!nextInSeries || isHidden || currentPage < book.pages) return null

	const renderContent = () => {
		const content = (
			<>
				<Button
					size="icon"
					className="absolute right-2 top-2"
					variant="ghost"
					onClick={() => setIsHidden(true)}
				>
					<X className="h-4 w-4" onClick={() => setIsHidden(true)} />
				</Button>

				<div className="flex flex-col gap-4">
					<div>
						<Label className="opacity-80">Next Up:</Label>
						<Text size="lg">{nextInSeries.name}</Text>
					</div>

					<EntityImage
						className="rounded-xl object-contain shadow"
						src={nextInSeries.thumbnailUrl}
					/>

					<ButtonOrLink variant="secondary" href={paths.bookReader(nextInSeries.id)}>
						Read
					</ButtonOrLink>
				</div>
			</>
		)

		const trigger = (
			<div className="cursor-pointer rounded-full border border-[#898d9480] bg-black/30 p-2 backdrop-blur-sm transition-all duration-200 hover:border-[#898d94] md:bg-black/5">
				<ArrowRight
					className={cn('h-6 w-6 text-white', {
						'rotate-180 transform': readingDirection === ReadingDirection.Rtl,
					})}
				/>
			</div>
		)

		if (isMobile) {
			return (
				<Popover>
					<Popover.Trigger asChild>{trigger}</Popover.Trigger>
					<Popover.Content
						side={readingDirection === ReadingDirection.Ltr ? 'left' : 'right'}
						sideOffset={8}
						className="relative w-72"
					>
						{content}
					</Popover.Content>
				</Popover>
			)
		} else {
			return (
				<HoverCard
					trigger={trigger}
					side={readingDirection === ReadingDirection.Ltr ? 'left' : 'right'}
					contentClassName="w-72 relative"
					sideOffset={8}
				>
					{content}
				</HoverCard>
			)
		}
	}

	return (
		<div
			className={cn(
				'absolute top-1/2 z-[60] flex -translate-y-1/2 items-center justify-center',
				readingDirection === ReadingDirection.Ltr ? 'right-4' : 'left-4',
			)}
		>
			{renderContent()}
		</div>
	)
}
