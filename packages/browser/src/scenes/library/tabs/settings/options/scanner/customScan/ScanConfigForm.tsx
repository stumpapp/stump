import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, cn, Form, RadioGroup, WideSwitch } from '@stump/components'
import { ScanOptions } from '@stump/sdk'
import { useCallback } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

export const FORM_ID = 'scan-config-form'

type Props = {
	onScan: (options: ScanOptions) => void
}

export default function ScanConfigForm({ onScan }: Props) {
	const form = useForm<FormValues>({
		defaultValues: {
			variant: 'force-rebuild',
			config: null,
		},
		resolver: zodResolver(schema),
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

	return (
		<Form form={form} onSubmit={handleSubmit} id={FORM_ID}>
			<RadioGroup
				value={variant}
				onValueChange={handleVariantChanged}
				className="divide gap-0 space-y-0 divide-y divide-edge overflow-hidden rounded-lg border border-edge"
			>
				<RadioGroup.CardItem
					label="Force rebuild"
					value="force-rebuild"
					description="Rebuild the entire library from scratch"
					className={cn('rounded-b-none border-0 bg-background hover:bg-background-surface/50', {
						'bg-background-surface/70 hover:bg-background-surface/70': variant === 'force-rebuild',
					})}
				/>

				<RadioGroup.CardItem
					label="Custom"
					value="custom"
					description="Customize the scan configuration"
					className={cn('rounded-t-none border-0 bg-background hover:bg-background-surface/50', {
						'bg-background-surface/70 hover:bg-background-surface/70': variant === 'custom',
					})}
				/>
			</RadioGroup>

			{variant === 'force-rebuild' && (
				<Alert level="info">
					<Alert.Content>
						This will rebuild every book in the library from scratch, including metadata and hashes
					</Alert.Content>
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

const schema = z
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
			return config.regen_meta || config.regen_hashes ? true : 'At least one option must be enabled'
		}
	})
	.transform((data) => ({
		...data,
		config: data.variant === 'force-rebuild' ? { force_rebuild: true } : data.config,
	}))
type FormValues = z.infer<typeof schema>
const isFormVariant = (variant: string): variant is FormValues['variant'] =>
	['force-rebuild', 'custom'].includes(variant)
