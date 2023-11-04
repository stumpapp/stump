import { Meta, StoryObj } from '@storybook/react'

import { Button, Text } from '..'
import { Popover } from './Popover'

const StoryMeta: Meta<typeof Popover> = {
	component: Popover,
	title: 'popover/Popover',
}
type Story = StoryObj<typeof Popover>

const Demo = () => {
	return (
		<div className="flex h-full w-full items-center justify-center">
			<Popover>
				<Popover.Trigger>
					<Button>Trigger</Button>
				</Popover.Trigger>
				<Popover.Content>
					<Text>Content!</Text>
				</Popover.Content>
			</Popover>
		</div>
	)
}

export const Default: Story = {
	render: () => <Demo />,
}

export default StoryMeta
