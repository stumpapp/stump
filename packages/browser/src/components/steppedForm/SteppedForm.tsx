import { useEffect, useRef } from 'react'

import { SceneContainer } from '../container'
import { SteppedFormContext } from './context'
import { MobileStepHeader } from './MobileStepHeader'
import { StepHeader } from './StepHeader'
import { SteppedFormFooter } from './SteppedFormFooter'
import { StepperSidebar } from './StepperSidebar'
import type { SteppedFormStep } from './types'
import { useSteppedFormState } from './useSteppedFormState'

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
			<div className="flex w-full flex-1">
				{/* top-12 for page header offset*/}
				<StepperSidebar className="top-12 lg:flex hidden h-[calc(var(--main-height)-3rem)]" />

				<SceneContainer className="min-w-0 flex-1">
					<MobileStepHeader className="lg:hidden" />

					<div className="max-w-4xl flex w-full flex-col">
						<StepHeader />

						<div key={step?.key} className="mt-6 gap-8 flex flex-col">
							{step?.render()}
						</div>

						<SteppedFormFooter submitLabel={submitLabel} isSubmitting={isSubmitting} />
					</div>
				</SceneContainer>
			</div>
		</SteppedFormContext.Provider>
	)
}
