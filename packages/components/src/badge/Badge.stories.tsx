import { ComponentMeta, ComponentStory } from '@storybook/react'

import { Badge } from './Badge'

export default {
	component: Badge,
	title: 'badge/Badge',
} as ComponentMeta<typeof Badge>

const Template: ComponentStory<typeof Badge> = (args) => <Badge {...args} />

export const Default = Template.bind({})
Default.args = {
	children: 'My Badge',
}

export const Primary = Template.bind({})
Primary.args = {
	children: 'My Badge',
	variant: 'primary',
}
