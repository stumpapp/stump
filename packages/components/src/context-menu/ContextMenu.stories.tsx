import { Meta, StoryObj } from '@storybook/react'
import { ComponentProps } from 'react'

import { ContextMenu } from './ContextMenu'

const StoryMeta: Meta<typeof ContextMenu> = {
	component: ContextMenu,
	title: 'menu/ContextMenu',
}
type Story = StoryObj<typeof ContextMenu>

type DemoProps = Partial<ComponentProps<typeof ContextMenu>>
const defaultArgs: Omit<ComponentProps<typeof ContextMenu>, 'children'> = {
	groups: [
		{
			items: [
				{
					label: 'Save As...',
					shortCut: '⇧⌘P',
				},
				{
					label: 'Some Action',
				},
			],
		},
		{
			items: [
				{
					label: 'Back',
					shortCut: '⌘[',
				},
				{
					label: 'Forward',
					shortCut: '⌘]',
				},
				{
					label: 'Reload',
					shortCut: '⌘R',
				},
			],
		},
		{
			items: [
				{
					label: 'More',
					subItems: [
						{
							label: 'Cool Stuff',
						},
						{
							label: 'More Cool Stuff',
						},
						{
							label: 'Kier oh kier',
						},
					],
				},
			],
		},
	],
}
const Demo = (args: DemoProps) => (
	<ContextMenu groups={args.groups || defaultArgs.groups}>
		<span className="dark:text-gray-50">Right click me</span>
	</ContextMenu>
)

export const Default: Story = {
	render: () => <Demo />,
}

export default StoryMeta
