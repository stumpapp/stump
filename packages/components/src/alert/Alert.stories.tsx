import { ComponentMeta, ComponentStory } from '@storybook/react'

import { Alert } from './Alert'

export default {
	component: Alert,
	title: 'alert/Alert',
} as ComponentMeta<typeof Alert>

const Template: ComponentStory<typeof Alert> = (args) => <Alert {...args} />

export const Default = Template.bind({})
Default.args = {
	children: 'My Alert',
}

export const Primary = Template.bind({})
Primary.args = {
	children: 'My Alert',
}
