import { ComponentMeta, ComponentStory } from '@storybook/react'
import { ComponentProps, useEffect, useRef, useState } from 'react'

import { ProgressBar } from './ProgressBar'

export default {
	component: ProgressBar,
	title: 'progress/ProgressBar',
} as ComponentMeta<typeof ProgressBar>

type StoryProps = ComponentProps<typeof ProgressBar> & {
	animated?: boolean
	speed?: number
}
const Story = (args: StoryProps) => {
	const interval = useRef<NodeJS.Timer>()
	const [value, setValue] = useState(args.value || 0)

	useEffect(() => {
		if (args.animated) {
			if (interval.current) {
				clearInterval(interval.current)
			}

			interval.current = setInterval(() => {
				setValue((value) => (value < 100 ? value + 1 : 0))
			}, args.speed || 100)
		}

		return () => {
			if (interval.current) {
				clearInterval(interval.current)
			}
		}
	}, [args.animated, args.speed])

	return (
		<div className="flex w-full items-center justify-center">
			<ProgressBar {...args} value={value} />
		</div>
	)
}

const Template: ComponentStory<typeof Story> = (args) => <Story {...args} />

export const Default = Template.bind({})
Default.args = {
	value: 10,
}

export const Animated = Template.bind({})
Animated.args = {
	animated: true,
	speed: 75,
}
