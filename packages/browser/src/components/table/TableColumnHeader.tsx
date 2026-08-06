import { Text } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'

type Props = {
	translationKey: string
	variant?: 'muted' | 'secondary'
}

export default function TableColumnHeader({ translationKey, variant = 'secondary' }: Props) {
	const { t } = useLocaleContext()

	return (
		<Text size="sm" variant={variant}>
			{t(translationKey)}
		</Text>
	)
}
