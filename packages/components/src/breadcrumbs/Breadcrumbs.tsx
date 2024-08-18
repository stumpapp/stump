import React from 'react'

import { Link } from '../link'
import { Text } from '../text'
import { cn, cx } from '../utils'

export type Segment = {
	label: string
	to?: string
	noShrink?: boolean
}
export type BreadcrumbsProps = {
	segments: Segment[]
	trailingSlash?: boolean
	className?: string
	variant?: 'subtle' | 'prominent'
}
export default function Breadcrumbs({
	variant = 'subtle',
	className,
	segments,
	trailingSlash,
}: BreadcrumbsProps) {
	return (
		<div
			className={cn(
				'flex items-center',
				{ 'text-sm': variant === 'subtle' },
				{ 'text-base': variant === 'prominent' },
				className,
			)}
		>
			{segments?.map((segment, i) => {
				const Component = segment.to ? Link : Text

				return (
					<React.Fragment key={segment.label}>
						{i > 0 && <span className="mx-1.5 text-foreground-muted md:mx-2">/</span>}
						<Component
							className={cx('line-clamp-1', { 'shrink-0': segment.noShrink })}
							{...(segment.to ? { to: segment.to } : {})}
						>
							{segment.label}
						</Component>
					</React.Fragment>
				)
			})}
			{trailingSlash && <span className="mx-2 text-foreground-muted">/</span>}
		</div>
	)
}
