import { ComponentMeta, ComponentStory } from '@storybook/react'

import { Heading } from './Heading'

export default {
	component: Heading,
	title: 'input/Heading',
} as ComponentMeta<typeof Heading>

const Template: ComponentStory<typeof Heading> = (args) => <Heading {...args} />

export const Default = Template.bind({})
Default.args = {
	children: 'My Heading',
}
