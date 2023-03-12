import { ComponentMeta, ComponentStory } from '@storybook/react'

import { Label } from './Label'

export default {
	component: Label,
	title: 'form/Label',
} as ComponentMeta<typeof Label>

const Template: ComponentStory<typeof Label> = (args) => <Label {...args} />

export const Default = Template.bind({})
Default.args = {
	children: 'My Label',
}
