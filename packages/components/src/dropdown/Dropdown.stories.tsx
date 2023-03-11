import { ComponentMeta, ComponentStory } from '@storybook/react'
import { CreditCard, Settings, User } from 'lucide-react'
import { ComponentProps } from 'react'

import { DropdownMenu } from './DropdownMenu'

export default {
	argTypes: {},
	component: DropdownMenu,

	title: 'dropdown/DropdownMenu',
} as ComponentMeta<typeof DropdownMenu>

type StoryProps = Partial<ComponentProps<typeof DropdownMenu>>
const defaultArgs: ComponentProps<typeof DropdownMenu> = {
	groups: [
		{
			items: [
				{
					label: 'Profile',
					leftIcon: <User className="mr-2 h-4 w-4" />,
					shortCut: '⇧⌘P',
				},
				{
					label: 'Billing',
					leftIcon: <CreditCard className="mr-2 h-4 w-4" />,
					shortCut: '⌘B',
				},
				{
					label: 'Settings',
					leftIcon: <Settings className="mr-2 h-4 w-4" />,
					shortCut: '⌘S',
				},
			],
			title: 'My Account',
		},
		{
			items: [
				{
					label: 'Nested Menu',
					subItems: [
						{
							label: 'Doubly Nested',
							subItems: [
								{
									label: 'Bingo Bango Bongo',
								},
							],
						},
					],
				},
				{
					label: 'Something something',
				},
				{
					label: 'Vicky',
				},
				{
					label: 'Something something',
				},
			],
		},
	],
	label: 'Dropdown',
}
const Story = (args: StoryProps) => (
	<DropdownMenu
		// @ts-expect-error: its fine
		label={args.label || defaultArgs.label}
		groups={args.groups || defaultArgs.groups}
	/>
)
const Template: ComponentStory<typeof Story> = (args) => <Story {...args} />

export const Default = Template.bind({})
Default.args = {
	label: 'Dropdown',
}
