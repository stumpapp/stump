import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type SteppedFormStep = {
	key: string
	icon: LucideIcon
	/**
	 * fields validated with `form.trigger` before moving past this step
	 */
	fields?: string[]
	isReview?: boolean
	render: () => ReactNode
}

export type StepStatus = 'upcoming' | 'active' | 'complete' | 'error'
