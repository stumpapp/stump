import { cn, Heading, Text } from '@stump/components'

import { useTheme } from '../hooks'

export type OwlType =
	// | 'search'
	// | 'construction'
	// | 'developing'
	'shrug'
// | 'empty'
// | 'error'
// | 'network-error'

const getOwl = (owl: OwlType, isDark: boolean): string | undefined => {
	const postfix = isDark ? 'dark' : 'light'
	switch (owl) {
		case 'shrug':
			return `/assets/owls/owl-shrug-${postfix}.png`
	}
}

type OwlProps = {
	owl: OwlType
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'>

export function Owl({ owl, className, ...props }: OwlProps) {
	const { isDarkVariant } = useTheme()
	const src = getOwl(owl, isDarkVariant)
	if (!src) return null
	return <img src={src} className={cn('sm:size-98 size-72', className)} {...props} />
}

type OwlEmptyStateProps = {
	owl?: OwlType
	title: string
	description?: string
	actions?: React.ReactNode
} & Omit<OwlProps, 'owl'>

export function OwlEmptyState({
	title,
	description,
	owl = 'shrug',
	actions,
	...owlProps
}: OwlEmptyStateProps) {
	return (
		<div className="gap-6 p-4 flex flex-1 flex-col items-center justify-center">
			<Owl owl={owl} {...owlProps} />

			<div className="gap-2 px-4 tablet:max-w-lg flex flex-col">
				<Heading size="lg" className="font-medium leading-6 text-center">
					{title}
				</Heading>
				{description && (
					<Text className="text-base text-center text-muted-foreground">{description}</Text>
				)}
			</div>

			{actions && <div className="gap-2 flex flex-col items-center">{actions}</div>}
		</div>
	)
}
