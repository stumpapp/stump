import { ComponentMeta, ComponentStory } from '@storybook/react'

import { Text } from './Text'

export default {
	component: Text,
	title: 'input/Text',
} as ComponentMeta<typeof Text>

const Template: ComponentStory<typeof Text> = (args) => <Text {...args} />

export const Default = Template.bind({})
Default.args = {
	children: 'My Text',
}
