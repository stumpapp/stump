import { Card, Stepper } from '~/components/ui'
import { useReaderStore } from '~/stores'

export default function PageMargins() {
	const store = useReaderStore((state) => ({
		pageMargins: state.globalSettings.pageMargins ?? 1.0,
		setSettings: state.setGlobalSettings,
	}))

	return (
		<Card.Row label="Page Margins">
			<Stepper
				value={store.pageMargins}
				onChange={(val) => store.setSettings({ pageMargins: val })}
				min={0.5}
				max={2.0}
				step={0.1}
				unit="%"
				formatValue={(val) => Math.round(val * 100).toString()}
				accessibilityLabel="Page Margins"
			/>
		</Card.Row>
	)
}
