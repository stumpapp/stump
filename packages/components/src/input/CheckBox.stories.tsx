import { ComponentMeta, ComponentStory } from '@storybook/react'

import { CheckBox } from './CheckBox'

export default {
	component: CheckBox,
	title: 'input/CheckBox',
} as ComponentMeta<typeof CheckBox>

const Template: ComponentStory<typeof CheckBox> = (args) => <CheckBox {...args} />

export const Default = Template.bind({})
Default.args = {
	id: 'my-label',
	label: 'My Label',
}
