import { ComponentMeta, ComponentStory } from '@storybook/react'

import { Avatar } from './Avatar'

export default {
	component: Avatar,
	title: 'image/Avatar',
} as ComponentMeta<typeof Avatar>

const Template: ComponentStory<typeof Avatar> = (args) => <Avatar {...args} />

export const Default = Template.bind({})
Default.args = {
	fallback: 'AL',
	src: 'https://avatars.githubusercontent.com/u/36278431?v=4',
}
