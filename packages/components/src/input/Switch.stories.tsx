import { ComponentMeta, ComponentStory } from '@storybook/react'

import { Switch } from './Switch'

export default {
	component: Switch,
	title: 'input/Switch',
} as ComponentMeta<typeof Switch>

const Template: ComponentStory<typeof Switch> = (args) => <Switch {...args} />

export const Default = Template.bind({})
Default.args = {
	label: 'My Label',
}

export const Primary = Template.bind({})
Primary.args = {
	label: 'My Label',
	variant: 'primary',
}
