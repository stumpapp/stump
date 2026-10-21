import { cn } from '@stump/components'

type Props = {
	children: React.ReactNode
	className?: string
}

export default function ContentContainer({ children, className }: Props) {
	return (
		<div className={cn('mt-6 gap-8 pb-16 md:gap-12 md:pb-4 max-w-4xl flex flex-col', className)}>
			{children}
		</div>
	)
}
