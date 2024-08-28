import { cn, Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { Check } from 'lucide-react'
import React, { useCallback } from 'react'

import { useCreateLibraryContext } from './context'

const NUM_STEPS = 3

export default function CreateLibraryStepIndicators() {
	const { formStep } = useCreateLibraryContext()
	const { t } = useLocaleContext()

	return (
		<div className="flex items-center">
			{Array.from({ length: NUM_STEPS }, (_, i) => {
				const step = i + 1
				const isComplete = step < formStep
				return (
					<div key={i} className="flex items-center">
						<Indicator
							step={step}
							label={t(getStepKey(step, 'label'))}
							isComplete={isComplete}
							currentStep={formStep}
						/>
						{step < NUM_STEPS && <div className="h-0.5 w-12 bg-edge" />}
					</div>
				)
			})}
		</div>
	)
}

const LOCALE_KEY = 'createLibraryScene'
const getStepKey = (step: number, key: string) => `${LOCALE_KEY}.form.steps.${step - 1}.${key}`

type IndicatorProps = {
	step: number
	currentStep: number
	label: string
	isComplete: boolean
}

// TODO: disable state based on whether the current step is valid?

const Indicator = ({ step, label, isComplete, currentStep }: IndicatorProps) => {
	const { setStep } = useCreateLibraryContext()

	const renderIcon = () => {
		if (isComplete) {
			return (
				<div className="flex h-4 w-4 items-center justify-center rounded-full bg-brand text-white">
					<Check className="h-3 w-3" />
				</div>
			)
		} else {
			return (
				<div className="flex h-4 w-4 items-center justify-center rounded-full border border-brand/70 text-xs text-foreground-muted">
					{step}
				</div>
			)
		}
	}

	const handleClick = useCallback(() => {
		if (currentStep > step) {
			setStep(step)
		}
	}, [currentStep, setStep, step])

	return (
		<button
			className={cn('flex items-center space-x-2 rounded-full border border-edge px-2.5 py-1.5', {
				'border-brand': currentStep === step,
			})}
			onClick={handleClick}
			type="button"
		>
			{renderIcon()}
			<Text size="sm">{label}</Text>
		</button>
	)
}
