import { ComponentMeta, ComponentStory } from '@storybook/react'

import { TextArea } from './TextArea'

export default {
	argTypes: {},
	component: TextArea,

	title: 'input/TextArea',
} as ComponentMeta<typeof TextArea>

const Template: ComponentStory<typeof TextArea> = (args) => <TextArea {...args} />

export const Default = Template.bind({})
Default.args = {
	placeholder: 'Enter your text here...',
}

export const WithLabel = Template.bind({})
WithLabel.args = {
	label: 'My Label',
	placeholder: 'Enter your text here...',
}
