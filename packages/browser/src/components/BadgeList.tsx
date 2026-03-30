import { cn, useBoolean } from '@stump/components'
import { Children, ReactNode, useEffect, useRef, useState } from 'react'

type Props = {
	children: ReactNode
	className?: string
	maxItems?: number
}

export default function BadgeList({ children, className, maxItems = 20 }: Props) {
	const containerRef = useRef<HTMLDivElement>(null)

	const [expanded, { toggle }] = useBoolean(false)
	const [height, setHeight] = useState<number | 'auto'>('auto')

	const items = Children.toArray(children)
	const overflows = items.length > maxItems
	const visible = expanded || !overflows ? items : items.slice(0, maxItems)

	useEffect(() => {
		if (containerRef.current) {
			setHeight(containerRef.current.scrollHeight)
		}
	}, [visible.length])

	return (
		<div>
			<div
				className="overflow-hidden"
				style={{
					height,
					transition: 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
				}}
			>
				<div ref={containerRef} className={cn('flex flex-wrap gap-1', className)}>
					{visible}
				</div>
			</div>

			{overflows && (
				<div className="relative mt-1.5 flex w-full items-center">
					<div className="flex-1 border-t border-dashed border-edge" />
					<button
						onClick={toggle}
						className="cursor-pointer rounded-full border border-dashed border-edge bg-background px-3 py-0.5 text-xs font-medium text-foreground-muted transition-colors hover:bg-background-surface hover:text-foreground"
					>
						{expanded ? 'See less' : `See ${items.length - maxItems} more`}
					</button>
					<div className="flex-1 border-t border-dashed border-edge" />
				</div>
			)}
		</div>
	)
}
