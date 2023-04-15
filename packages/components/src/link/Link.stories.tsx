import { ComponentMeta, ComponentStory } from '@storybook/react'

import { Link } from './Link'

export default {
	component: Link,
	title: 'input/Link',
} as ComponentMeta<typeof Link>

const Template: ComponentStory<typeof Link> = (args) => <Link {...args} />

export const Default = Template.bind({})
Default.args = {
	children: 'My Link',
}
