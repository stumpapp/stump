import { Meta, StoryObj } from '@storybook/react'

import { Link } from './Link'

const StoryMeta: Meta<typeof Link> = {
	component: Link,
	title: 'input/Link',
}
type Story = StoryObj<typeof Link>

export const Default: Story = {
	render: () => <Link>My Link</Link>,
}

export default StoryMeta
