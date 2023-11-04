import { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router'

import { Sheet } from './Sheet'

const StoryMeta: Meta<typeof Sheet> = {
	component: Sheet,
	title: 'sheet/Sheet',
}

type Story = StoryObj<typeof Sheet>

export const Default: Story = {
	render: () => (
		<MemoryRouter>
			<Sheet
				description="Sheet Description"
				footer="Sheet Footer"
				position="right"
				title="Sheet Title"
				trigger="Open Sheet"
			>
				<div className="h-full">Sheet Content</div>
			</Sheet>
		</MemoryRouter>
	),
}

export default StoryMeta
