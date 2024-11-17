import { cn, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Check } from 'lucide-react'
import { useCallback } from 'react'

import { useSteppedFormContext } from './context'

export default function SteppedFormIndicators() {
	const { currentStep, localeBase, stepsBeforeReview } = useSteppedFormContext()
	const { t } = useLocaleContext()

	return (
		<div className="flex items-center">
			{Array.from({ length: stepsBeforeReview }, (_, i) => {
				const step = i + 1
				const isComplete = step < currentStep
				return (
					<div key={i} className="flex items-center">
						<Indicator
							step={step}
							label={t(getStepKey(localeBase, step, 'label'))}
							isComplete={isComplete}
							currentStep={currentStep}
						/>
						{step < stepsBeforeReview && <div className="h-0.5 w-12 bg-edge" />}
					</div>
				)
			})}
		</div>
	)
}

const getStepKey = (base: string, step: number, key: string) =>
	`${base}.form.steps.${step - 1}.${key}`

type IndicatorProps = {
	/**
	 * The step for this indicator
	 */
	step: number
	/**
	 * The step which is currently active in the form
	 */
	currentStep: number
	/**
	 * The label for this step
	 */
	label: string
	/**
	 * Whether this step is complete
	 */
	isComplete: boolean
}

const Indicator = ({ step, label, isComplete, currentStep }: IndicatorProps) => {
	const { setStep } = useSteppedFormContext()

	const renderIcon = () => {
		if (isComplete) {
			return (
				<div className="flex h-4 w-4 items-center justify-center rounded-full bg-fill-brand text-white">
					<Check className="h-3 w-3" />
				</div>
			)
		} else {
			return (
				<div className="flex h-4 w-4 items-center justify-center rounded-full border border-edge-brand/70 text-xs text-foreground-muted">
					{step}
				</div>
			)
		}
	}

	/**
	 * A handler to set the step to this indicator's step. Note that this is only
	 * allowed if the step is less than the current step, since we are unaware of the
	 * validity of the form at this point.
	 */
	const handleClick = useCallback(() => {
		if (currentStep > step) {
			setStep(step)
		}
	}, [currentStep, setStep, step])

	return (
		<button
			className={cn('flex items-center space-x-2 rounded-full border border-edge px-2.5 py-1.5', {
				'border-edge-brand': currentStep === step,
			})}
			onClick={handleClick}
			type="button"
		>
			{renderIcon()}
			<Text size="sm">{label}</Text>
		</button>
	)
}
