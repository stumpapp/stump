import { SecondarySidebar } from '@/components/sharedLayout'

import { StepList } from './StepList'

type Props = {
	className?: string
}

export function StepperSidebar({ className }: Props) {
	return (
		<SecondarySidebar className={className}>
			<StepList />
		</SecondarySidebar>
	)
}
