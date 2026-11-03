import { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

import { CollectionStackedThumbnails, StackedThumbnail } from './CollectionStackedThumbnails'

export type CollectionStat = {
	key: string
	icon: LucideIcon
	value: number
	label: string
}

type Props = {
	title: string
	to: string
	thumbnails: StackedThumbnail[]
	layoutNumber: number | undefined
	stats?: CollectionStat[]
	onHover?: () => void
}

/** a card for a collection of things (libraries, smart lists, etc) with a stack of thumbs */
export function CollectionGridItem({ title, to, thumbnails, layoutNumber, stats, onHover }: Props) {
	return (
		<Link
			to={to}
			onMouseEnter={onHover}
			className="group relative block w-full rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
		>
			<CollectionStackedThumbnails
				thumbnails={thumbnails}
				layoutNumber={layoutNumber}
				className="transition-opacity group-hover:opacity-90"
			/>

			{!!stats?.length && (
				<div className="left-0 top-0 gap-1.5 px-3 py-2 absolute z-70 flex">
					{stats.map(({ key, icon: Icon, value, label }) => (
						<span
							key={key}
							title={label}
							className="gap-1 px-2 py-1 text-xs font-medium bg-black/40 text-white shadow-sm backdrop-blur-sm flex items-center rounded-full tabular-nums"
						>
							<Icon className="h-3 w-3" />
							{value}
						</span>
					))}
				</div>
			)}

			<div className="bottom-0 left-0 px-3 py-2 absolute z-70 w-full">
				<span className="text-lg font-bold tracking-wide text-white text-shadow-sm block truncate">
					{title}
				</span>
			</div>
		</Link>
	)
}
