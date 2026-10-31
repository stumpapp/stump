import { Button, cn } from '@stump/components'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { useTranslate } from '@/hooks/useTranslate'

import { useSteppedFormContext } from './context'

type Props = {
	submitLabel: string
	isSubmitting?: boolean
}

export function SteppedFormFooter({ submitLabel, isSubmitting }: Props) {
	const { isFirst, isReview, next, back } = useSteppedFormContext()
	const { translate } = useTranslate()

	// FIXME(ui): sticky not working, prolly a container in tree above messing with it

	// Note: The submit button is always rendered because I noticed that conditional rendering
	// causes the form to trigger a submit event. FYI
	return (
		<footer
			className={cn(
				'bottom-0 mt-8 -mx-4 gap-3 px-4 pb-2 sticky z-10 flex items-center justify-between bg-background',
				'lg:relative lg:mx-0 lg:px-0 lg:pt-4 lg:pb-0',
			)}
		>
			<Button type="button" variant="outline" onClick={back} className={cn({ invisible: isFirst })}>
				<ChevronLeft />
				{translate('shared.common.back')}
			</Button>

			<Button
				type="button"
				onClick={(event) => {
					event.preventDefault()
					next()
				}}
				className={cn({
					hidden: isReview,
				})}
			>
				{translate('shared.common.next')}
				<ChevronRight />
			</Button>

			<Button
				type="submit"
				isLoading={isSubmitting}
				className={cn({
					hidden: !isReview,
				})}
			>
				{submitLabel}
			</Button>
		</footer>
	)
}
