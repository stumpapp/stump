import { Button, NewCard } from '@stump/components'
import type { PropsWithChildren, ReactNode } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

import { useSteppedFormContext } from './context'
import { getStepKey } from './utils'

type ReviewSectionProps = PropsWithChildren<{
	stepIndex: number
}>

// NOTE(ui): i couldn't think of any better standard way to do this, i think it is
// okay but VERY card heavy

export function ReviewSection({ stepIndex, children }: ReviewSectionProps) {
	const { goTo, localeBase } = useSteppedFormContext()
	const { t, translate } = useTranslate()

	return (
		<NewCard
			label={t(getStepKey(localeBase, stepIndex, 'heading'))}
			actions={
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => goTo(stepIndex)}
					className="text-muted-foreground"
				>
					{translate('shared.common.edit')}
				</Button>
			}
		>
			{children}
		</NewCard>
	)
}

type ReviewItemProps = {
	label: string
	value?: ReactNode
}

export function ReviewItem({ label, value }: ReviewItemProps) {
	const { translate } = useTranslate()

	const isEmpty = value == null || value === '' || (Array.isArray(value) && !value.length)

	return <NewCard.Row label={label} value={isEmpty ? translate('shared.common.none') : value} />
}
