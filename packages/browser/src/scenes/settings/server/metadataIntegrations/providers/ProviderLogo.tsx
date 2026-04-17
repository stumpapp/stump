import { cn } from '@stump/components'
import { MetadataProvider } from '@stump/graphql'

type Props = {
	provider: MetadataProvider
	className?: string
}

export function ProviderLogo({ provider, className }: Props) {
	return (
		<img
			src={LOGOS[provider]}
			alt={`${provider[0] + provider.slice(1).toLowerCase()} logo`}
			className={cn('h-16 w-16 object-scale-down', className, {
				'rotate-[12deg] transform': provider === MetadataProvider.Hardcover,
			})}
		/>
	)
}

const LOGOS: Record<MetadataProvider, string> = {
	[MetadataProvider.Hardcover]: '/assets/logos/hardcover.png',
}
