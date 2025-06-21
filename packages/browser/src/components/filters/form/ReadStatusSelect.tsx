import GenericFilterMultiselect from './GenericFilterMultiselect'

export default function ReadStatusSelect() {
	return (
		<GenericFilterMultiselect
			name="read_status"
			label="Read Status"
			options={[
				{
					label: 'Completed',
					value: 'finished',
				},
				{
					label: 'Reading',
					value: 'reading',
				},
				{
					label: 'Unread',
					value: 'not_started',
				},
			]}
		/>
	)
}
