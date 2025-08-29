import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, AlertDescription, cn, Form, RadioGroup, WideSwitch } from '@stump/components'
import { useLocaleContext } from '@stump/i18n'
import { AlertTriangle } from 'lucide-react'
import { useCallback } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { useLibraryManagement } from '../../../context'
import { ScanOptions } from '../history/ScanHistoryTable'

export const FORM_ID = 'scan-config-form'

type Props = {
	onScan: (options: ScanOptions) => void
}

export default function ScanConfigForm({ onScan }: Props) {
	const { t } = useLocaleContext()
	const {
		library: { config: libraryConfig },
	} = useLibraryManagement()
	const form = useForm<FormValues>({
		defaultValues: {
			variant: 'force-rebuild',
			config: null,
		},
		resolver: zodResolver(createSchema(t)),
	})

	const variant = form.watch('variant')
	const config = useWatch({ control: form.control, name: 'config' })

	const handleSubmit = useCallback(({ config }: FormValues) => onScan({ config }), [onScan])
	const handleVariantChanged = useCallback(
		(value: string) => {
			if (isFormVariant(value)) {
				form.setValue('variant', value)
			}
		},
		[form],
	)

	const regenMeta = !!config && 'regen_meta' in config ? config?.regen_meta : false
	const regenHashes = !!config && 'regen_hashes' in config ? config?.regen_hashes : false

	const showOverrideAlert =
		(regenMeta && !libraryConfig.processMetadata) ||
		(regenHashes && !libraryConfig.generateFileHashes)

	return (
		<Form form={form} onSubmit={handleSubmit} id={FORM_ID}>
			{showOverrideAlert && (
				<Alert variant="warning" className="rounded-xl p-3">
					<AlertTriangle />
					<AlertDescription className="text-sm text-foreground-subtle">
						{t(getKey('alert'))}
					</AlertDescription>
				</Alert>
			)}

			<RadioGroup
				value={variant}
				onValueChange={handleVariantChanged}
				className="divide gap-0 space-y-0 divide-y divide-edge overflow-hidden rounded-xl border border-edge"
			>
				<RadioGroup.CardItem
					label={t(getOptionKey('forceRebuild', 'label'))}
					value="force-rebuild"
					description={t(getOptionKey('forceRebuild', 'description'))}
					className={cn('rounded-b-none border-0 bg-background hover:bg-background-surface/50', {
						'bg-background-surface/70 hover:bg-background-surface/70': variant === 'force-rebuild',
					})}
				/>

				<RadioGroup.CardItem
					label={t(getOptionKey('custom', 'label'))}
					value="custom"
					description={t(getOptionKey('custom', 'description'))}
					className={cn('rounded-t-none border-0 bg-background hover:bg-background-surface/50', {
						'bg-background-surface/70 hover:bg-background-surface/70': variant === 'custom',
					})}
				/>
			</RadioGroup>

			{variant === 'force-rebuild' && (
				<Alert variant="info" className="rounded-xl p-3">
					<AlertDescription className="text-sm text-foreground-subtle">
						{t(getOptionKey('forceRebuild', 'alert'))}
					</AlertDescription>
				</Alert>
			)}

			{variant === 'custom' && (
				<div className="flex flex-col gap-6 p-4">
					<WideSwitch
						label="Rebuild metadata"
						description="Rebuild metadata for all books in the library"
						name="config.regen_meta"
						checked={regenMeta}
						onCheckedChange={(value) => form.setValue('config.regen_meta', value)}
					/>

					<WideSwitch
						label="Rebuild hashes"
						description="Rebuild hashes for all books in the library"
						name="config.regen_hashes"
						checked={regenHashes}
						onCheckedChange={(value) => form.setValue('config.regen_hashes', value)}
					/>
				</div>
			)}
		</Form>
	)
}

// TODO(graphql): Fix
const createSchema = (t: (key: string) => string) =>
	z
		.object({
			variant: z.enum(['force-rebuild', 'custom']),
			config: z
				.object({
					regen_meta: z.boolean().default(false),
					regen_hashes: z.boolean().default(false),
				})
				.nullish(),
		})
		.refine(({ config }) => {
			if (!config) return true
			if ('regen_meta' in config && 'regen_hashes' in config) {
				return config.regen_meta || config.regen_hashes
					? true
					: t(getOptionKey('custom', 'validation.noSelection'))
			}
		})
		.transform((data) => ({
			...data,
			config: data.variant === 'force-rebuild' ? { force_rebuild: true } : data.config,
		}))
type FormValues = z.infer<ReturnType<typeof createSchema>>
const isFormVariant = (variant: string): variant is FormValues['variant'] =>
	['force-rebuild', 'custom'].includes(variant)

const LOCALE_BASE = 'librarySettingsScene.options/scanning.sections.configureScan.form'
const getKey = (key: string) => `${LOCALE_BASE}.${key}`
const getOptionKey = (option: string, key: string) => `${LOCALE_BASE}.options.${option}.${key}`
