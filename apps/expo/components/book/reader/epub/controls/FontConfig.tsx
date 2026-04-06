import { useShallow } from 'zustand/react/shallow'

import { Card, Stepper, Switch } from '~/components/ui'
import { Picker } from '~/components/ui/picker/picker'
import type { PickerOption } from '~/components/ui/picker/types'
import { useTranslate } from '~/lib/hooks'
import { useReaderStore } from '~/stores'

const FONT_OPTIONS: PickerOption[] = [
	{ label: 'System', value: '' },
	{ label: 'OpenDyslexic', value: 'OpenDyslexic' },
	{ label: 'Literata', value: 'Literata' },
	{ label: 'Atkinson Hyperlegible', value: 'Atkinson-Hyperlegible' },
	{ label: 'Charis SIL', value: 'CharisSIL' },
	{ label: 'Bitter', value: 'Bitter' },
]

export default function FontConfig() {
	const { t } = useTranslate()
	const store = useReaderStore(
		useShallow((state) => ({
			fontFamily: state.globalSettings.fontFamily ?? '',
			fontSize: state.globalSettings.fontSize ?? 16,
			fontWeight: state.globalSettings.fontWeight ?? 400,
			textNormalization: state.globalSettings.textNormalization ?? false,
			verticalText: state.globalSettings.verticalText ?? false,
			setSettings: state.setGlobalSettings,
		})),
	)

	const fontWeightOptions: PickerOption[] = [
		{ label: t(getKey('fontWeight.options.light')), value: '300' },
		{ label: t(getKey('fontWeight.options.normal')), value: '400' },
		{ label: t(getKey('fontWeight.options.medium')), value: '500' },
		{ label: t(getKey('fontWeight.options.bold')), value: '700' },
	]

	const ensureNumber = (value: string, cb: (num: number) => void) => {
		const parsed = parseInt(value, 10)
		if (!isNaN(parsed)) {
			cb(parsed)
		}
	}

	return (
		<Card>
			<Card.Row label={t(getKey('typeface'))}>
				<Picker
					value={store.fontFamily}
					options={FONT_OPTIONS}
					onValueChange={(value) => store.setSettings({ fontFamily: value || undefined })}
				/>
			</Card.Row>

			<Card.Row label={t(getKey('fontSize'))}>
				<Stepper
					value={store.fontSize}
					onChange={(val) => store.setSettings({ fontSize: Math.round(val) })}
					min={8}
					max={32}
					step={1}
					formatValue={(val) => val.toString()}
					accessibilityLabel={t(getKey('fontSize'))}
				/>
			</Card.Row>

			<Card.Row label={t(getKey('fontWeight.label'))}>
				<Picker
					value={String(store.fontWeight)}
					options={fontWeightOptions}
					onValueChange={(value) =>
						ensureNumber(value, (num) => store.setSettings({ fontWeight: num }))
					}
				/>
			</Card.Row>

			<Card.Row label={t(getKey('textNormalization'))}>
				<Switch
					checked={store.textNormalization}
					onCheckedChange={(checked) => store.setSettings({ textNormalization: checked })}
					accessibilityLabel={t(getKey('textNormalization'))}
				/>
			</Card.Row>

			<Card.Row label={t(getKey('verticalText'))}>
				<Switch
					checked={store.verticalText}
					onCheckedChange={(checked) => store.setSettings({ verticalText: checked })}
					accessibilityLabel="Toggle Vertical Text"
				/>
			</Card.Row>
		</Card>
	)
}

const LOCALE_BASE = 'epubSettings'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
