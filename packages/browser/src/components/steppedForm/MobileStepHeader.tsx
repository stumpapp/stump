import { Button, cn, Sheet } from '@stump/components'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { useTranslate } from '@/hooks/useTranslate'

import { useSteppedFormContext } from './context'
import { StepList } from './StepList'
import { getStepKey } from './utils'

type Props = {
	className?: string
}

export function MobileStepHeader({ className }: Props) {
	const { steps, statuses, currentIndex, localeBase } = useSteppedFormContext()
	const { t } = useTranslate()
	const [open, setOpen] = useState(false)

	// not the most elagant but all the negative margin to align the button with the
	// steps lines
	return (
		<div
			className={cn(
				// top-12 for page header offset
				'top-12 -mx-4 -mt-4 px-4 pt-2 pb-3 sticky z-10 border-b border-border bg-background',
				className,
			)}
		>
			<Button
				type="button"
				variant="ghost"
				aria-haspopup="dialog"
				onClick={() => setOpen(true)}
				className="-mx-2 h-9 px-2 w-[calc(100%+1rem)] justify-between"
			>
				<span className="min-w-0 truncate">
					<span className="text-muted-foreground">
						{t(`${localeBase}.form.stepLabel`)} {currentIndex + 1}/{steps.length} {'· '}
					</span>
					{t(getStepKey(localeBase, currentIndex, 'label'))}
				</span>
				<ChevronDown className="text-muted-foreground" />
			</Button>

			<div className="mt-1.5 gap-1 flex" aria-hidden>
				{statuses.map((status, index) => (
					<span
						key={index}
						className={cn('h-1 flex-1 rounded-full bg-muted', {
							'bg-primary': status === 'active' || status === 'complete',
							'bg-destructive': status === 'error',
						})}
					/>
				))}
			</div>

			<Sheet
				open={open}
				onClose={() => setOpen(false)}
				position="bottom"
				size="content"
				title={t('steppedForm.sheetTitle')}
			>
				<div className="px-4 pb-4 max-h-[70svh] overflow-y-auto">
					<StepList onSelect={() => setOpen(false)} />
				</div>
			</Sheet>
		</div>
	)
}
