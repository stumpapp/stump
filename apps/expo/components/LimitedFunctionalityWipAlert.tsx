import { CircleAlert } from 'lucide-react-native'

import { useTranslate } from '~/lib/hooks'

import { Alert } from './ui/alert'

export function LimitedFunctionalityWipAlert() {
	const { translate } = useTranslate()

	return (
		<Alert icon={CircleAlert} variant="destructive">
			<Alert.Title>{translate('shared.common.notFullyImplemented.label')}</Alert.Title>
			<Alert.Description>
				{translate('shared.common.notFullyImplemented.description')}
			</Alert.Description>
		</Alert>
	)
}
