import { ComponentMeta, ComponentStory } from '@storybook/react'
import { ComponentProps, useState } from 'react'

import { DatePicker } from './DatePicker'

type StoryProps = Pick<ComponentProps<typeof DatePicker>, 'maxDate' | 'minDate'>
const Story = (props: StoryProps) => {
	const [date, setDate] = useState<Date | undefined>()

	return <DatePicker selected={date} onChange={setDate} {...props} />
}

export default {
	args: {
		children: 'DatePicker',
	},
	component: DatePicker,
	title: 'calendar/DatePicker',
} as ComponentMeta<typeof DatePicker>

const Template: ComponentStory<typeof Story> = (args) => <Story {...args} />

export const Basic = Template.bind({})
Basic.args = {}

export const WithBounds = Template.bind({})
WithBounds.args = {
	// 10 days from now
	maxDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
	// today
	minDate: new Date(),
}
