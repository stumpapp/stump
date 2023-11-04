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
	<div className="flex flex-col space-y-3 px-6 py-4 dark:text-gray-100">
		<div className="flex w-full items-center justify-between">
			<span className="flex items-center space-x-3">
				<Library className="h-5 w-5" />
				<Heading as="h1" size="sm">
					Libraries
				</Heading>
			</span>

			<Link href="#">See More</Link>
		</div>

		<div className="flex h-full min-h-[10rem] w-full flex-1 items-center justify-center">
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
