import { View } from 'react-native'

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	Heading,
	Label,
	RadioGroup,
	RadioGroupItem,
	Text,
} from '~/components/ui'
import { useReaderStore } from '~/stores'

import FontSizeSlider from './FontSizeSlider'

export default function FontConfig() {
	const store = useReaderStore((state) => ({
		fontFamily: state.globalSettings.fontFamily,
		save: state.setGlobalSettings,
	}))

	return (
		<View className="gap-2">
			<Heading className="pl-4">Font</Heading>

			<View className="flex-row px-6 py-2">
				<FontSizeSlider />
			</View>

			<View className="flex-row justify-between px-6 py-2">
				<View className="flex-1">
					<Text className="text-lg text-foreground">Font family</Text>
					<Accordion type="single" collapsible className="w-full">
						<AccordionItem value="item-1" className="border-0">
							<AccordionTrigger>
								<Text
									className="text-lg font-normal"
									style={{
										fontFamily: store.fontFamily
											? getPath(store.fontFamily as SupportedMobileFont)
											: undefined,
									}}
								>
									{store.fontFamily &&
										store.fontFamily.charAt(0).toUpperCase() + store.fontFamily.slice(1)}
									{!store.fontFamily && 'System'}
								</Text>
							</AccordionTrigger>
							<AccordionContent>
								<RadioGroup
									value={store.fontFamily || ''}
									onValueChange={(value) => store.save({ fontFamily: value || undefined })}
								>
									<View className="flex flex-row items-center gap-4">
										<RadioGroupItem
											value={''}
											className="hover:bg-accent flex flex-row items-center rounded-md px-2 py-1"
										/>
										<Label className="text-lg font-normal" htmlFor={''}>
											System
										</Label>
									</View>

									{Fonts.map((font) => (
										<View key={font.value} className="flex flex-row items-center gap-4">
											<RadioGroupItem
												value={font.value}
												className="hover:bg-accent flex flex-row items-center rounded-md px-2 py-1"
											/>
											<Label
												className="text-lg font-normal"
												style={{ fontFamily: getPath(font.value) }}
												htmlFor={font.value}
											>
												{font.label}
											</Label>
										</View>
									))}
								</RadioGroup>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</View>
			</View>
		</View>
	)
}

type SupportedMobileFont =
	| 'OpenDyslexic'
	| 'Literata'
	| 'Atkinson-Hyperlegible'
	| 'CharisSIL'
	| 'Bitter'

const Fonts = [
	{ label: 'OpenDyslexic', value: 'OpenDyslexic' },
	{ label: 'Literata', value: 'Literata' },
	{ label: 'Atkinson Hyperlegible', value: 'Atkinson-Hyperlegible' },
	{ label: 'Charis SIL', value: 'CharisSIL' },
	{ label: 'Bitter', value: 'Bitter' },
] satisfies { label: string; value: SupportedMobileFont }[]

const getPath = (font: SupportedMobileFont) => {
	switch (font) {
		case 'OpenDyslexic':
			return 'OpenDyslexic-Regular'
		case 'Literata':
			return 'Literata'
		case 'Atkinson-Hyperlegible':
			return 'Atkinson Hyperlegible'
		case 'CharisSIL':
			return 'CharisSIL'
		case 'Bitter':
			return 'Bitter'
	}
}
