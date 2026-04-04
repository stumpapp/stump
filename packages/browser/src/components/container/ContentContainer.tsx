import { cn } from '@stump/components'

import { usePreferences } from '@/hooks'

type Props = {
	children: React.ReactNode
	className?: string
}

export default function ContentContainer({ children, className }: Props) {
	const {
		preferences: { primaryNavigationMode },
	} = usePreferences()

	return (
		<div
			className={cn(
				'mt-6 gap-8 pb-16 md:gap-12 md:pb-4 flex flex-col',
				{
					'max-w-4xl': primaryNavigationMode === 'SIDEBAR',
				},
				className,
			)}
		>
			{children}
		</div>
	)
}
