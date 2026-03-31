import { Meta, StoryObj } from '@storybook/react'
import { Library } from 'lucide-react'

import { Link } from '../link'
import { Heading } from '../text'
import { Card } from './Card'

const StoryMeta: Meta<typeof Card> = {
	component: Card,
	title: 'card/Card',
}

const DemoChild = () => (
	<div className="space-y-3 px-6 py-4 flex flex-col dark:text-gray-100">
		<div className="flex w-full items-center justify-between">
			<span className="space-x-3 flex items-center">
				<Library className="h-5 w-5" />
				<Heading as="h1" size="sm">
					Libraries
				</Heading>
			</span>

			<Link href="#">See More</Link>
		</div>

		<div className="min-h-40 flex h-full w-full flex-1 items-center justify-center">
			<span>Card Body!</span>
		</div>
	</div>
)

type Story = StoryObj<typeof Card>

export const Default: Story = {
	render: () => (
		<Card>
			<DemoChild />
		</Card>
	),
}

export default StoryMeta
