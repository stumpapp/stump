import { useLocaleContext } from '@stump/i18n'

import GenericFilterMultiselect from './GenericFilterMultiselect'

export default function ReadStatusSelect() {
	const { t } = useLocaleContext()
	return (
		<GenericFilterMultiselect
			name="read_status"
			label={t('filterUi.readStatus.label')}
			options={[
				{
					label: t('common.completed'),
					value: 'finished',
				},
				{
					label: t('filterUi.readStatus.options.reading'),
					value: 'reading',
				},
				{
					label: t('filterUi.readStatus.options.unread'),
					value: 'not_started',
				},
			]}
		/>
	)
}
