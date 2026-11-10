import { Button, cn, Heading, ToolTip } from '@stump/components'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReactNode } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

type Props = {
	title: ReactNode
	canSkipBackward: boolean
	canSkipForward: boolean
	onSkipBackward: () => void
	onSkipAhead: () => void
}

// TODO: actions?

export function CardListHeader({
	title,
	canSkipBackward,
	canSkipForward,
	onSkipBackward,
	onSkipAhead,
}: Props) {
	const { t } = useTranslate()

	return (
		<div className="flex flex-row items-center justify-between">
			{typeof title === 'string' ? <Heading size="sm">{title}</Heading> : title}
			<div className={cn('gap-2 flex self-end', { hidden: !canSkipBackward && !canSkipForward })}>
				<ToolTip
					content={t('slidingList.buttons.previous')}
					isDisabled={!canSkipBackward}
					align="end"
				>
					<Button variant="ghost" size="icon" disabled={!canSkipBackward} onClick={onSkipBackward}>
						<ChevronLeft className="h-4 w-4" />
					</Button>
				</ToolTip>
				<ToolTip content={t('slidingList.buttons.next')} isDisabled={!canSkipForward} align="end">
					<Button variant="ghost" size="icon" disabled={!canSkipForward} onClick={onSkipAhead}>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</ToolTip>
			</div>
		</div>
	)
}
