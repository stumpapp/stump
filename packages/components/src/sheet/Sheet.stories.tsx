import { ComponentMeta, ComponentStory } from '@storybook/react'
import { MemoryRouter } from 'react-router'

import { Sheet } from './Sheet'

export default {
	component: Sheet,
	title: 'sheet/Sheet',
} as ComponentMeta<typeof Sheet>

const Template: ComponentStory<typeof Sheet> = (args) => (
	<MemoryRouter>
		<Sheet {...args} />
	</MemoryRouter>
)

export const Default = Template.bind({})
Default.args = {
	children: 'Sheet Content',
	description: 'Sheet Description',
	footer: 'Sheet Footer',
	position: 'right',
	title: 'Sheet Title',
	trigger: 'Open Sheet',
}

export const Floating = Template.bind({})
Floating.args = {
	children: 'Sheet Content',
	description: 'Sheet Description',
	floating: true,
	footer: 'Sheet Footer',
	title: 'Sheet Title',
	trigger: 'Open Sheet',
}
