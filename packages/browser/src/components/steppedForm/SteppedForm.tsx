import { useEffect, useRef } from 'react'

import { SteppedFormContext } from './context'
import { MobileStepHeader } from './MobileStepHeader'
import { StepHeader } from './StepHeader'
import { SteppedFormFooter } from './SteppedFormFooter'
import type { SteppedFormStep } from './types'
import { useSteppedFormState } from './useSteppedFormState'
import { VerticalStepper } from './VerticalStepper'

type Props = {
	localeBase: string
	steps: SteppedFormStep[]
	submitLabel: string
	isSubmitting?: boolean
}

/**
 * Must be rendered inside a `Form`, since navigation validates through the form context
 */
export function SteppedForm({ localeBase, steps, submitLabel, isSubmitting }: Props) {
	const state = useSteppedFormState(steps)

	const isFirstRender = useRef(true)

	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false
			return
		}
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}, [state.currentIndex])

	const step = steps[state.currentIndex]

	// TODO(ui): animate presence would be a plus but not doing that now

	return (
		<SteppedFormContext.Provider value={{ localeBase, steps, ...state }}>
			<div className="lg:flex-row lg:items-start lg:gap-8 flex w-full flex-col">
				<MobileStepHeader className="lg:hidden" />

				<aside className="top-4 w-56 lg:block sticky hidden shrink-0">
					<VerticalStepper />
				</aside>

				<div className="max-w-4xl min-w-0 flex flex-1 flex-col">
					<StepHeader />

					<div key={step?.key} className="mt-6 gap-8 flex flex-col">
						{step?.render()}
					</div>

					<SteppedFormFooter submitLabel={submitLabel} isSubmitting={isSubmitting} />
				</div>
			</div>
		</SteppedFormContext.Provider>
	)
}
