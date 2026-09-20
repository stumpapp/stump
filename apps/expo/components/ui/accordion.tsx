import * as AccordionPrimitive from '@rn-primitives/accordion'
import { ChevronDown } from 'lucide-react-native'
import { Platform, Pressable, View } from 'react-native'
import Animated, {
	FadeOutUp,
	LayoutAnimationConfig,
	LinearTransition,
	useAnimatedStyle,
	useDerivedValue,
	withTiming,
} from 'react-native-reanimated'

import { cn } from '~/lib/utils'

import { Icon } from './icon'
import { TextClassContext } from './text'

function Accordion({
	children,
	...props
}: Omit<AccordionPrimitive.RootProps, 'asChild'> &
	React.RefAttributes<AccordionPrimitive.RootRef>) {
	return (
		<LayoutAnimationConfig skipEntering>
			<AccordionPrimitive.Root
				{...(props as AccordionPrimitive.RootProps)}
				asChild={Platform.OS !== 'web'}
			>
				<Animated.View layout={LinearTransition.duration(200)}>{children}</Animated.View>
			</AccordionPrimitive.Root>
		</LayoutAnimationConfig>
	)
}

function AccordionItem({
	children,
	className,
	value,
	...props
}: AccordionPrimitive.ItemProps & React.RefAttributes<AccordionPrimitive.ItemRef>) {
	return (
		<AccordionPrimitive.Item
			className={cn(
				'border-b border-border',
				Platform.select({ web: 'last:border-b-0' }),
				className,
			)}
			value={value}
			asChild
			{...props}
		>
			<Animated.View
				className="native:overflow-hidden"
				layout={Platform.select({ native: LinearTransition.duration(200) })}
			>
				{children}
			</Animated.View>
		</AccordionPrimitive.Item>
	)
}

const Trigger = Platform.OS === 'web' ? View : Pressable

function AccordionTrigger({
	className,
	children,
	...props
}: AccordionPrimitive.TriggerProps & {
	children?: React.ReactNode
} & React.RefAttributes<AccordionPrimitive.TriggerRef>) {
	const { isExpanded } = AccordionPrimitive.useItemContext()

	const progress = useDerivedValue(
		() => (isExpanded ? withTiming(1, { duration: 250 }) : withTiming(0, { duration: 200 })),
		[isExpanded],
	)
	const chevronStyle = useAnimatedStyle(
		() => ({
			transform: [{ rotate: `${progress.value * 180}deg` }],
		}),
		[progress],
	)

	return (
		<TextClassContext.Provider
			value={cn('text-sm font-medium text-left', Platform.select({ web: 'group-hover:underline' }))}
		>
			<AccordionPrimitive.Header>
				<AccordionPrimitive.Trigger {...props} asChild>
					<Trigger
						className={cn(
							'gap-4 py-4 flex-row items-start justify-between rounded-md disabled:opacity-50',
							Platform.select({
								web: 'flex flex-1 transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none [&[data-state=open]>svg]:rotate-180',
							}),
							className,
						)}
					>
						<>{children}</>
						<Animated.View style={chevronStyle}>
							<Icon
								as={ChevronDown}
								size={16}
								className={cn(
									'text-foreground-muted shrink-0',
									Platform.select({
										web: 'translate-y-0.5 pointer-events-none transition-transform duration-200',
									}),
								)}
							/>
						</Animated.View>
					</Trigger>
				</AccordionPrimitive.Trigger>
			</AccordionPrimitive.Header>
		</TextClassContext.Provider>
	)
}

function AccordionContent({
	className,
	children,
	...props
}: AccordionPrimitive.ContentProps & React.RefAttributes<AccordionPrimitive.ContentRef>) {
	const { isExpanded } = AccordionPrimitive.useItemContext()
	return (
		<TextClassContext.Provider value="text-sm">
			<AccordionPrimitive.Content
				className={cn(
					'overflow-hidden',
					Platform.select({
						web: isExpanded ? 'animate-accordion-down' : 'animate-accordion-up',
					}),
				)}
				{...props}
			>
				<Animated.View
					exiting={Platform.select({ native: FadeOutUp.duration(200) })}
					className={cn('pb-4', className)}
				>
					{children}
				</Animated.View>
			</AccordionPrimitive.Content>
		</TextClassContext.Provider>
	)
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
