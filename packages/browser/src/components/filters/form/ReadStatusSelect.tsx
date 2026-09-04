import { useLocaleContext } from '@stump/i18n'

import GenericFilterMultiselect from './GenericFilterMultiselect'

export default function ReadStatusSelect() {
	const { t } = useLocaleContext()

	return (
		<GenericFilterMultiselect
			name="read_status"
			label={t('mediaFilterForm.readStatusSelect.label')}
			options={[
				{
					label: t('mediaFilterForm.readStatusSelect.options.completed'),
					value: 'finished',
				},
				{
					label: t('mediaFilterForm.readStatusSelect.options.reading'),
					value: 'reading',
				},
				{
					label: t('mediaFilterForm.readStatusSelect.options.unread'),
					value: 'not_started',
				},
			]}
		/>
	)
}
