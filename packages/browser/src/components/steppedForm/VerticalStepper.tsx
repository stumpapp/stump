import { Button, cn } from '@stump/components'
import { AlertCircle, Check } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

import { useSteppedFormContext } from './context'
import { getStepKey } from './utils'

type Props = {
	onSelect?: (index: number) => void
}

export function VerticalStepper({ onSelect }: Props) {
	const { steps, statuses, currentIndex, goTo, localeBase } = useSteppedFormContext()
	const { t } = useTranslate()

	// FIXME: these feel too chunky next to the primary sidebar
	return (
		<ol aria-label={t('steppedForm.sheetTitle')} className="gap-y-2 flex flex-col">
			{steps.map((step, index) => {
				const status = statuses[index]
				const isActive = index === currentIndex
				const Icon = status === 'complete' ? Check : status === 'error' ? AlertCircle : step.icon

				return (
					<li key={step.key} className="relative">
						{index < steps.length - 1 && (
							<span
								aria-hidden
								// pl-1 = 4, w-8 = 32, center ~36/2, px wide, left ~20px but didn't quite look right,
								// maybe margin/gap is offseting further. 20.5 looks better
								className={cn('top-9.5 -bottom-4 absolute left-[20.5px] w-px bg-border', {
									'bg-primary/60': status === 'complete',
									'bg-destructive/60': status === 'error',
								})}
							/>
						)}

						<Button
							type="button"
							variant="ghost"
							aria-current={isActive ? 'step' : undefined}
							onClick={() => {
								onSelect?.(index)
								void goTo(index)
							}}
							className={cn('gap-3 p-1 h-auto w-full justify-start text-left whitespace-normal', {
								'bg-muted': isActive,
							})}
						>
							<span
								className={cn(
									'h-8 w-8 flex shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground',
									{
										'border-primary text-primary ring-2 ring-primary/20': status === 'active',
										'bg-primary/10 text-primary': status === 'complete',
										'border-destructive text-destructive': status === 'error',
									},
								)}
							>
								<Icon />
							</span>

							<span className="min-w-0 line-clamp-1">
								{t(getStepKey(localeBase, index, 'label'))}
							</span>
						</Button>
					</li>
				)
			})}
		</ol>
	)
}
