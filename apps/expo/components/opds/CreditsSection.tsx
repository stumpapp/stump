import { OPDSMetadata } from '@stump/sdk'
import { useMemo } from 'react'
import { View } from 'react-native'

import MetadataBadgeSection from '~/components/overview/MetadataBadgeSection'
import { useTranslate } from '~/lib/hooks'

import { extractCredits, OPDSMetadataLinkableItem } from './utils'

type Props = {
	metadata: OPDSMetadata | null | undefined
	onPressCredit?: (credit: OPDSMetadataLinkableItem) => void
}

export default function CreditsSection({ metadata, onPressCredit }: Props) {
	const { t } = useTranslate()
	const credits = useMemo(() => extractCredits(metadata), [metadata])

	if (credits.length === 0) {
		return null
	}

	return (
		<View className="gap-6">
			{credits.map((credit) => (
				<MetadataBadgeSection
					key={credit.labelKey}
					label={t(`opds.credits.${credit.labelKey}`)}
					items={credit.items.map((item) => ({
						label: item.label,
						onPress: onPressCredit ? () => onPressCredit(item) : undefined,
					}))}
				/>
			))}
		</View>
	)
}
