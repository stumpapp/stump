import { ComponentMeta, ComponentStory } from '@storybook/react'

import { Input } from './Input'

export default {
	component: Input,
	title: 'input/Input',
} as ComponentMeta<typeof Input>

const Template: ComponentStory<typeof Input> = (args) => <Input {...args} />

export const Default = Template.bind({})
Default.args = {
	label: 'My Label',
}

export const WithDescription = Template.bind({})
WithDescription.args = {
	description: 'My Description',
	label: 'My Label',
}

export const Primary = Template.bind({})
Primary.args = {
	label: 'My Label',
	variant: 'primary',
}

export const AutoComplete = Template.bind({})
AutoComplete.args = {
	autoComplete: 'username',
	id: 'username',
	label: 'My Label',
	variant: 'primary',
}
