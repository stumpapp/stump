import { Meta, StoryObj } from '@storybook/react'

import { Heading } from './Heading'

const StoryMeta: Meta<typeof Heading> = {
	component: Heading,
	title: 'input/Heading',
}
type Story = StoryObj<typeof Heading>

export const Default: Story = {
	render: () => <Heading>My Heading</Heading>,
}

export default StoryMeta
