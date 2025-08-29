import { Badge, Button, Dialog, TextArea } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import lowerFirst from 'lodash/lowerFirst'
import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type Props<Field extends string> = {
	binding: Field
	onSave: (values: string[]) => void
}

export default function AddFieldsDialog<Field extends string>({ binding, onSave }: Props<Field>) {
	const [isOpen, setIsOpen] = useState(false)

	const { t } = useLocaleContext()
	const label = lowerFirst(t(getLabelKey(binding)))

	const [value, setValue] = useState('')

	const parsedValues = useMemo(
		() =>
			value
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line.length > 0),
		[value],
	)

	useEffect(() => {
		return () => {
			setValue('')
		}
	}, [isOpen])

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<Dialog.Trigger asChild>
				<Button size="icon" variant="secondary" className="ml-2 h-5 w-5">
					<Plus className="h-4 w-4" />
				</Button>
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>
						{t('common.add')} {label}
					</Dialog.Title>
					<Dialog.Description>{t('metadataEditor.addFields.description')}</Dialog.Description>
					<Dialog.Close />
				</Dialog.Header>

				<div className="flex flex-col gap-y-4">
					<TextArea
						placeholder={`${t('common.enter')} ${label}...`}
						rows={4}
						value={value}
						onChange={(e) => setValue(e.target.value)}
					/>

					<div className="flex flex-wrap gap-2">
						{parsedValues.map((value, index) => (
							<Badge key={index}>{value}</Badge>
						))}
					</div>
				</div>

				<Dialog.Footer>
					<Button onClick={() => setIsOpen(false)}>{t('common.cancel')}</Button>
					<Button
						variant="primary"
						disabled={parsedValues.length === 0}
						onClick={() => {
							onSave(parsedValues)
							setIsOpen(false)
						}}
					>
						{t('common.add')}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog>
	)
}

const LOCALE_BASE = `metadataEditor`
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
const getLabelKey = (binding: string) => getKey(`labels.${binding}`)
