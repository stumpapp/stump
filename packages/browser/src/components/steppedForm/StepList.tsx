import { cn } from '@stump/components'
import { AlertCircle, Check } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

import { useSteppedFormContext } from './context'
import { getStepKey } from './utils'

type Props = {
	onSelect?: (index: number) => void
}

export function StepList({ onSelect }: Props) {
	const { steps, statuses, currentIndex, goTo, localeBase } = useSteppedFormContext()
	const { t } = useTranslate()

	return (
		<ol aria-label={t('steppedForm.sheetTitle')} className="gap-y-0.5 text-sm flex flex-col">
			{steps.map((step, index) => {
				const status = statuses[index]
				const isActive = index === currentIndex
				const Icon = status === 'complete' ? Check : status === 'error' ? AlertCircle : step.icon

				// i tried numbers (e.g., 1  label) but it just didn't look good, i think there is room for a little
				// improvement but for now i think a large improvement than what i had before
				return (
					<li key={step.key}>
						<button
							type="button"
							aria-current={isActive ? 'step' : undefined}
							onClick={() => {
								onSelect?.(index)
								void goTo(index)
							}}
							className={cn(
								'gap-2 px-2 py-1.5 font-medium flex w-full items-center rounded-md text-left text-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
								{ 'bg-accent text-accent-foreground': isActive },
							)}
						>
							<Icon
								className={cn('h-4 w-4 shrink-0', {
									'text-primary': status === 'complete',
									'text-destructive': status === 'error',
								})}
							/>
							<span className="line-clamp-1">{t(getStepKey(localeBase, index, 'label'))}</span>
						</button>
					</li>
				)
			})}
		</ol>
	)
}
