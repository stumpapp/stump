import { Meta, StoryObj } from '@storybook/react'

import { Text } from '..'
import { ToolTip } from './ToolTip'

const StoryMeta: Meta<typeof ToolTip> = {
	component: ToolTip,
	title: 'tooltip/ToolTip',
}

const Demo = () => {
	return (
		<div className="flex h-full w-full items-center justify-center">
			<ToolTip content={<Text>Content!</Text>}>
				<Text>Trigger</Text>
			</ToolTip>
		</div>
	)
}

export const Default: StoryObj<typeof ToolTip> = {
	render: () => <Demo />,
}

export default StoryMeta
