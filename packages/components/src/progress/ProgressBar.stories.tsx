import { ComponentMeta, ComponentStory } from '@storybook/react'

import { ProgressBar } from './ProgressBar'

export default {
	component: ProgressBar,
	title: 'progress/ProgressBar',
} as ComponentMeta<typeof ProgressBar>

const Template: ComponentStory<typeof ProgressBar> = (args) => <ProgressBar {...args} />

export const Default = Template.bind({})
Default.args = {
	value: 10,
}
