import { useCallback, useState } from 'react'
import { useFormContext } from 'react-hook-form'

import type { SteppedFormStep, StepStatus } from './types'

export function useSteppedFormState(steps: SteppedFormStep[]) {
	const form = useFormContext()
	const [currentIndex, setCurrentIndex] = useState(0)
	const [visited, setVisited] = useState<Set<number>>(() => new Set([0]))
	const [errored, setErrored] = useState<Set<number>>(() => new Set())

	const validate = useCallback(
		async (index: number) => {
			const fields = steps[index]?.fields
			const isValid = fields?.length ? await form.trigger(fields) : true

			setErrored((previous) => {
				const next = new Set(previous)
				if (isValid) {
					next.delete(index)
				} else {
					next.add(index)
				}
				return next
			})

			return isValid
		},
		[form, steps],
	)

	const goTo = useCallback(
		async (target: number) => {
			const clamped = Math.max(0, Math.min(target, steps.length - 1))
			if (clamped === currentIndex) return

			// we don't care about validating if going backwards
			if (clamped < currentIndex) {
				setCurrentIndex(clamped)
				return
			}

			// because we validate when going forwards, each skipped step
			// too if applicable
			for (let index = currentIndex; index < clamped; index++) {
				if (!(await validate(index))) {
					setCurrentIndex(index)
					return
				}
				setVisited((previous) => new Set(previous).add(index))
			}

			setVisited((previous) => new Set(previous).add(clamped))
			setCurrentIndex(clamped)
		},
		[currentIndex, steps, validate],
	)

	const statuses = steps.map<StepStatus>((_, index) => {
		if (errored.has(index)) return 'error'
		if (index === currentIndex) return 'active'
		return visited.has(index) && index < currentIndex ? 'complete' : 'upcoming'
	})

	return {
		currentIndex,
		statuses,
		goTo,
		next: () => goTo(currentIndex + 1),
		back: () => goTo(currentIndex - 1),
		isFirst: currentIndex === 0,
		isReview: !!steps[currentIndex]?.isReview,
	}
}
