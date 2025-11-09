import { OPDSFeed } from '@stump/sdk'
import { View } from 'react-native'

import { cn } from '~/lib/utils'

import { Heading } from '../ui'

type Props = {
	feed: OPDSFeed
	className?: string
}

export default function FeedTitle({ feed: { metadata }, className }: Props) {
	const title = metadata.title || 'OPDS Feed'

	return (
		<View className={cn('flex items-start gap-4 px-4', className)}>
			<Heading size="lg" className="mt-6 leading-6">
				{title}
			</Heading>
		</View>
	)
}
