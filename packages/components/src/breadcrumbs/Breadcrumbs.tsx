import React from 'react'

import { Link } from '../link'
import { Text } from '../text'
import { cx } from '../utils'

export type Segment = {
	label: string
	to?: string
	noShrink?: boolean
}
export type BreadcrumbsProps = {
	segments: Segment[]
}
export default function Breadcrumbs({ segments }: BreadcrumbsProps) {
	return (
		<div className="flex items-center text-sm md:text-base">
			{segments?.map((segment, i) => {
				const Component = segment.to ? Link : Text

				return (
					<React.Fragment key={segment.label}>
						{i > 0 && <span className="mx-2 text-gray-500 dark:text-gray-450">/</span>}
						<Component
							className={cx('line-clamp-1', { 'shrink-0': segment.noShrink })}
							{...(segment.to ? { to: segment.to } : {})}
						>
							{segment.label}
						</Component>
					</React.Fragment>
				)
			})}
		</div>
	)
}
