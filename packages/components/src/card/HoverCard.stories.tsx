import { Meta, StoryObj } from '@storybook/react'
import React from 'react'

import { Button } from '../button'
import { HoverCard } from './HoverCard'

const StoryMeta: Meta<typeof HoverCard> = {
	component: HoverCard,
	title: 'card/HoverCard',
}

const Demo = () => (
	<HoverCard
		trigger={
			<Button variant="ghost" className="underline underline-offset-2">
				@stumpapp
			</Button>
		}
	>
		<React.Fragment>
			<div className="flex justify-between space-x-4">
				<div className="space-y-1">
					<h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50">@stumpapp</h4>
					<p className="text-sm text-gray-800 dark:text-gray-100">A WIP media server</p>
				</div>
			</div>
		</React.Fragment>
	</HoverCard>
)
type Story = StoryObj<typeof HoverCard>
export const Default: Story = {
	render: () => <Demo />,
}

export default StoryMeta
