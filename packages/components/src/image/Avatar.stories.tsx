import { Meta, StoryObj } from '@storybook/react'

import { Avatar } from './Avatar'

const StoryMeta: Meta<typeof Avatar> = {
	component: Avatar,
	title: 'image/Avatar',
}
type Story = StoryObj<typeof Avatar>

export const Default: Story = {
	render: () => <Avatar fallback="AL" src="https://avatars.githubusercontent.com/u/36278431?v=4" />,
}

export default StoryMeta
