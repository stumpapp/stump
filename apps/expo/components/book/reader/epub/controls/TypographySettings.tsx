import { useShallow } from 'zustand/react/shallow'

import { Card, Stepper, Switch } from '~/components/ui'
import { Picker } from '~/components/ui/picker/picker'
import type { PickerOption } from '~/components/ui/picker/types'
import { useTranslate } from '~/lib/hooks'
import { TextAlignment } from '~/modules/readium'
import { useReaderStore } from '~/stores'

import PublisherStyles from './PublisherStyles'

export default function TypographySettings() {
	const { t } = useTranslate()
	const store = useReaderStore(
		useShallow((state) => ({
			allowPublisherStyles: state.globalSettings.allowPublisherStyles ?? true,
			textAlign: state.globalSettings.textAlign ?? 'justify',
			typeScale: state.globalSettings.typeScale ?? 1.0,
			lineHeight: state.globalSettings.lineHeight ?? 1.5,
			paragraphIndent: state.globalSettings.paragraphIndent,
			paragraphSpacing: state.globalSettings.paragraphSpacing,
			wordSpacing: state.globalSettings.wordSpacing,
			letterSpacing: state.globalSettings.letterSpacing,
			hyphens: state.globalSettings.hyphens,
			ligatures: state.globalSettings.ligatures,
			setSettings: state.setGlobalSettings,
		})),
	)

	const textAlignOptions: PickerOption<TextAlignment>[] = [
		{ label: t(getKey('textAlignment.options.start')), value: 'start' },
		{ label: t(getKey('textAlignment.options.left')), value: 'left' },
		{ label: t(getKey('textAlignment.options.center')), value: 'center' },
		{ label: t(getKey('textAlignment.options.right')), value: 'right' },
		{ label: t(getKey('textAlignment.options.justify')), value: 'justify' },
	]

	const isDisabled = store.allowPublisherStyles

	return (
		<Card>
			<PublisherStyles />

			<Card.Row label={t(getKey('textAlignment.label'))} disabled={isDisabled}>
				<Picker
					value={store.textAlign}
					options={textAlignOptions}
					onValueChange={(value) => store.setSettings({ textAlign: value })}
					disabled={isDisabled}
				/>
			</Card.Row>

			<Card.Row label={t(getKey('typeScale'))} disabled={isDisabled}>
				<Stepper
					value={store.typeScale}
					onChange={(val) => store.setSettings({ typeScale: val === 1.0 ? undefined : val })}
					min={0.5}
					max={2.0}
					step={0.1}
					disabled={isDisabled}
					formatValue={(val) => val.toFixed(1)}
					accessibilityLabel={t(getKey('typeScale'))}
				/>
			</Card.Row>

			<Card.Row label={t(getKey('lineHeight'))} disabled={isDisabled}>
				<Stepper
					value={store.lineHeight}
					onChange={(val) => store.setSettings({ lineHeight: val === 1.5 ? undefined : val })}
					min={1.0}
					max={3.0}
					step={0.1}
					disabled={isDisabled}
					formatValue={(val) => val.toFixed(1)}
					accessibilityLabel={t(getKey('lineHeight'))}
				/>
			</Card.Row>

			<Card.Row label={t(getKey('paragraphIndent'))} disabled={isDisabled}>
				<Stepper
					value={store.paragraphIndent ?? 0}
					onChange={(val) => store.setSettings({ paragraphIndent: val === 0 ? undefined : val })}
					min={0}
					max={3.0}
					step={0.25}
					disabled={isDisabled}
					unit="%"
					formatValue={(val) => Math.round(val * 100).toString()}
					accessibilityLabel={t(getKey('paragraphIndent'))}
				/>
			</Card.Row>

			<Card.Row label={t(getKey('paragraphSpacing'))} disabled={isDisabled}>
				<Stepper
					value={store.paragraphSpacing ?? 0}
					onChange={(val) => store.setSettings({ paragraphSpacing: val === 0 ? undefined : val })}
					min={0}
					max={3.0}
					step={0.25}
					disabled={isDisabled}
					unit="%"
					formatValue={(val) => Math.round(val * 100).toString()}
					accessibilityLabel={t(getKey('paragraphSpacing'))}
				/>
			</Card.Row>

			<Card.Row label={t(getKey('wordSpacing'))} disabled={isDisabled}>
				<Stepper
					value={store.wordSpacing ?? 0}
					onChange={(val) => store.setSettings({ wordSpacing: val === 0 ? undefined : val })}
					min={0}
					max={1.0}
					step={0.05}
					disabled={isDisabled}
					unit="%"
					formatValue={(val) => Math.round(val * 100).toString()}
					accessibilityLabel={t(getKey('wordSpacing'))}
				/>
			</Card.Row>

			<Card.Row label={t(getKey('letterSpacing'))} disabled={isDisabled}>
				<Stepper
					value={store.letterSpacing ?? 0}
					onChange={(val) => store.setSettings({ letterSpacing: val === 0 ? undefined : val })}
					min={0}
					max={0.5}
					step={0.025}
					disabled={isDisabled}
					unit="%"
					formatValue={(val) => Math.round(val * 100).toString()}
					accessibilityLabel={t(getKey('letterSpacing'))}
				/>
			</Card.Row>

			<Card.Row label={t(getKey('hyphens'))} disabled={isDisabled}>
				<Switch
					checked={store.hyphens ?? false}
					onCheckedChange={(checked) => store.setSettings({ hyphens: checked ? true : undefined })}
					accessibilityLabel={t(getKey('hyphens'))}
					disabled={isDisabled}
				/>
			</Card.Row>

			<Card.Row label={t(getKey('ligatures'))} disabled={isDisabled}>
				<Switch
					checked={store.ligatures ?? false}
					onCheckedChange={(checked) =>
						store.setSettings({ ligatures: checked ? true : undefined })
					}
					accessibilityLabel={t(getKey('ligatures'))}
					disabled={isDisabled}
				/>
			</Card.Row>
		</Card>
	)
}

const LOCALE_BASE = 'epubSettings'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
