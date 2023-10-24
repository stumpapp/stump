import { ComponentMeta, ComponentStory } from '@storybook/react'
import { useState } from 'react'

import Calendar from './Calendar'

const Story = () => {
	const [date, setDate] = useState<Date | undefined>(new Date())

	return (
		<div className="flex">
			<Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
		</div>
	)
}

export default {
	args: {
		children: 'Calendar',
	},
	component: Calendar,
	title: 'calendar/Calendar',
} as ComponentMeta<typeof Calendar>

const Template: ComponentStory<typeof Story> = () => <Story />

export const Basic = Template.bind({})
Basic.args = {}
