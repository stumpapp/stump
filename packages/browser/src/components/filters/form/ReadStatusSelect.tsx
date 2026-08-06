import GenericFilterMultiselect from './GenericFilterMultiselect'
import { useLocaleContext } from '@stump/i18n'

export default function ReadStatusSelect() {
	const { t } = useLocaleContext()
	return (
		<GenericFilterMultiselect
			name="read_status"
			label={t('filterUi.readStatus')}
			options={[
				{
					label: t('filterUi.completed'),
					value: 'finished',
				},
				{
					label: t('filterUi.reading'),
					value: 'reading',
				},
				{
					label: t('filterUi.unread'),
					value: 'not_started',
				},
			]}
		/>
	)
}
