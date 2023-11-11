import { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'

import Calendar from './Calendar'

const Demo = () => {
	const [date, setDate] = useState<Date | undefined>(new Date())

	return (
		<div className="flex">
			<Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
		</div>
	)
}

const StoryMeta: Meta<typeof Calendar> = {
	component: Calendar,
	title: 'calendar/Calendar',
}

type Story = StoryObj<typeof Calendar>
export const Default: Story = {
	render: () => <Demo />,
}

export default StoryMeta
