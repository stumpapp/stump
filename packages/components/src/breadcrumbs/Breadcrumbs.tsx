import { Fragment, ReactNode } from 'react'
import { Link as RouterLink } from 'react-router'

import { Dropdown } from '../dropdown/primitives'
import { cn } from '../utils'
import { Breadcrumb } from './breadcrumb'

export type BreadcrumbSegment = {
	label: string
	/** omit if for the current page */
	to?: string
	/** if true will never truncate this segment */
	noShrink?: boolean
	/** if provided will use instead of the label */
	render?: ReactNode
}

export type BreadcrumbsProps = {
	/* the pieces of the breadcrumbs, the last is treated as the current page */
	segments: BreadcrumbSegment[]
	/**
	 * the max number of segments shown inline (excluding the ellipsis when truncated).
	 * the leading segments (except first if `keepFirst`) collapse into a menu
	 */
	maxVisible?: number
	/** keep the first segment visible when collapsing */
	keepFirst?: boolean
	className?: string
}

type Visible =
	| { kind: 'segment'; segment: BreadcrumbSegment }
	| { kind: 'ellipsis'; hidden: BreadcrumbSegment[] }

const resolveVisible = (
	segments: BreadcrumbSegment[],
	maxVisible: number | undefined,
	keepFirst: boolean,
): Visible[] => {
	const asSegments = (list: BreadcrumbSegment[]): Visible[] =>
		list.map((segment) => ({ kind: 'segment', segment }))

	if (!maxVisible || segments.length <= maxVisible) {
		return asSegments(segments)
	}

	const head = keepFirst ? segments.slice(0, 1) : []
	const tailCount = Math.max(1, maxVisible - head.length)
	const tail = segments.slice(-tailCount)
	const hidden = segments.slice(head.length, segments.length - tail.length)

	return [...asSegments(head), { kind: 'ellipsis', hidden }, ...asSegments(tail)]
}

export function Breadcrumbs({
	segments,
	maxVisible,
	keepFirst = false,
	className,
}: BreadcrumbsProps) {
	const visible = resolveVisible(segments, maxVisible, keepFirst)

	return (
		<Breadcrumb className={cn('min-w-0', className)}>
			<Breadcrumb.List className="flex-nowrap">
				{visible.map((entry, idx) => {
					const isLast = idx === visible.length - 1

					return (
						<Fragment
							key={entry.kind === 'ellipsis' ? '__ellipsis' : `${idx}-${entry.segment.label}`}
						>
							{idx > 0 && <Breadcrumb.Separator />}
							{entry.kind === 'ellipsis' && (
								<Breadcrumb.Item className="shrink-0">
									<CollapsedSegments segments={entry.hidden} />
								</Breadcrumb.Item>
							)}
							{entry.kind === 'segment' && (
								<Breadcrumb.Item
									className={cn('min-w-0', entry.segment.noShrink ? 'shrink-0' : 'shrink')}
								>
									<SegmentContent segment={entry.segment} isPage={isLast} />
								</Breadcrumb.Item>
							)}
						</Fragment>
					)
				})}
			</Breadcrumb.List>
		</Breadcrumb>
	)
}

type SegmentContentProps = {
	segment: BreadcrumbSegment
	isPage: boolean
}

function SegmentContent({ segment, isPage }: SegmentContentProps) {
	if (segment.render) {
		return <>{segment.render}</>
	}

	if (!isPage && segment.to) {
		return (
			<Breadcrumb.Link asChild className="truncate">
				<RouterLink to={segment.to}>{segment.label}</RouterLink>
			</Breadcrumb.Link>
		)
	}

	return <Breadcrumb.Page className="font-medium truncate">{segment.label}</Breadcrumb.Page>
}

function CollapsedSegments({ segments }: { segments: BreadcrumbSegment[] }) {
	return (
		<Dropdown modal={false}>
			<Dropdown.Trigger className="rounded-md hover:text-foreground" aria-label="Show more">
				<Breadcrumb.Ellipsis />
			</Dropdown.Trigger>
			<Dropdown.Content align="start">
				{segments.map((segment) => (
					<>
						{segment.to != null && (
							<Dropdown.Item key={segment.label} asChild>
								<RouterLink to={segment.to}>{segment.label}</RouterLink>
							</Dropdown.Item>
						)}
						{segment.to == null && (
							<Dropdown.Item key={segment.label} disabled>
								{segment.label}
							</Dropdown.Item>
						)}
					</>
				))}
			</Dropdown.Content>
		</Dropdown>
	)
}
