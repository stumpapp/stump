import { Meta, StoryObj } from '@storybook/react'
import { ComponentProps, useState } from 'react'

import { DatePicker } from './DatePicker'

type DemoProps = Pick<ComponentProps<typeof DatePicker>, 'maxDate' | 'minDate'>
const Demo = (props: DemoProps) => {
	const [date, setDate] = useState<Date | undefined>()

	return <DatePicker selected={date} onChange={setDate} {...props} />
}

const StoryMeta: Meta<typeof DatePicker> = {
	component: DatePicker,
	title: 'calendar/DatePicker',
}
type Story = StoryObj<typeof DatePicker>

export const Default: Story = {
	render: () => <Demo />,
}

export const WithBounds: Story = {
	render: () => (
		<Demo maxDate={new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)} minDate={new Date()} />
	),
}

export default StoryMeta
