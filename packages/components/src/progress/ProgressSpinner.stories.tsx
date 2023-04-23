import { ComponentMeta, ComponentStory } from '@storybook/react'

import { ProgressSpinner } from './ProgressSpinner'

export default {
	component: ProgressSpinner,
	title: 'progress/ProgressSpinner',
} as ComponentMeta<typeof ProgressSpinner>

const Template: ComponentStory<typeof ProgressSpinner> = (args) => <ProgressSpinner {...args} />

export const Default = Template.bind({})
Default.args = {}

export const Primary = Template.bind({})
Primary.args = {
	variant: 'primary',
}

export const Small = Template.bind({})
Small.args = {
	size: 'sm',
	variant: 'primary',
}
