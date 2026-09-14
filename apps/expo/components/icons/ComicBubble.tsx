import { forwardRef } from 'react'
import Svg, { Path, type SvgProps } from 'react-native-svg'

type ComicBubbleProps = SvgProps & {
	size?: string | number
	absoluteStrokeWidth?: boolean
}

export const ComicBubble = forwardRef<Svg, ComicBubbleProps>(
	({ size = 24, color = 'currentColor', ...props }, ref) => {
		return (
			<Svg ref={ref} width={size} height={size} viewBox="0 -960 960 960" fill={color} {...props}>
				<Path d="m440-803-83 83H240v117l-83 83 83 83v117h117l83 83 100-100 168 85-86-167 101-101-83-83v-117H523l-83-83Zm0-113 116 116h164v164l116 116-116 116 115 226q7 13 4 25.5T828-132q-8 8-20.5 11t-25.5-4L556-240 440-124 324-240H160v-164L44-520l116-116v-164h164l116-116Zm0 396Z" />
			</Svg>
		)
	},
)

ComicBubble.displayName = 'ComicBubble'

export default ComicBubble
