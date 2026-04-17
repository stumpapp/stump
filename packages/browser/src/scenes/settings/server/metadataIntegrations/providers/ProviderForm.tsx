import {
	Alert,
	AlertDescription,
	cn,
	DatePicker,
	Input,
	Label,
	NativeSelect,
	PasswordInput,
	RawSwitch,
	Text,
} from '@stump/components'
import { MergeStrategy } from '@stump/graphql'
import { useLocaleContext } from '@stump/i18n'
import { startOfDay } from 'date-fns'
import { useFormContext, useFormState, useWatch } from 'react-hook-form'

import { PatchProviderConfigSchema } from './schema'

export default function ProviderForm() {
	const form = useFormContext<PatchProviderConfigSchema>()
	const { t } = useLocaleContext()
	const { errors } = useFormState({ control: form.control })

	const [providerEnabled, autoApplyEnabled, expirationDate] = useWatch({
		control: form.control,
		name: ['enabled', 'autoApplyConfig.enabled', 'apiTokenExpiresAt'],
	})

	const strategyOptions = [
		{
			label: t(getKey('autoApplyConfig.strategy.options.FILL_GAPS')),
			value: MergeStrategy.FillGaps,
		},
		{
			label: t(getKey('autoApplyConfig.strategy.options.FILL_AND_MERGE_LISTS')),
			value: MergeStrategy.FillAndMergeLists,
		},
		{
			label: t(getKey('autoApplyConfig.strategy.options.PREFER_EXTERNAL')),
			value: MergeStrategy.PreferExternal,
		},
	]

	return (
		<>
			<PasswordInput
				label={t(getKey('apiToken.label'))}
				description={t(getKey('apiToken.description'))}
				variant="primary"
				type="password"
				{...form.register('apiToken')}
				errorMessage={errors.apiToken?.message}
				fullWidth
			/>

			<div className="gap-2 flex flex-col">
				<Label>{t(getKey('apiTokenExpiresAt.label'))}</Label>
				<DatePicker
					minDate={startOfDay(new Date())}
					selected={expirationDate ?? undefined}
					onChange={(date) => form.setValue('apiTokenExpiresAt', date)}
				/>
				<Text className="text-sm text-foreground-muted">
					{t(getKey('apiTokenExpiresAt.description'))}
				</Text>
			</div>

			<div className="rounded-lg divide-y divide-edge border border-edge">
				<div className="gap-2 flex flex-col">
					<Label className="p-3 flex items-center justify-between">
						<div className="gap-1 flex flex-col">
							<span>{t(getKey('enableProvider.label'))}</span>
							<p className="text-sm text-foreground-muted">
								{t(getKey('enableProvider.description'))}
							</p>
						</div>

						<RawSwitch
							id="enabled"
							className="data-[state=checked]:bg-fill-brand-secondary/60 data-[state=unchecked]:bg-fill-brand-secondary"
							checked={providerEnabled ?? true}
							onCheckedChange={(checked) => form.setValue('enabled', checked)}
						/>
					</Label>
				</div>

				<div className="gap-2 flex flex-col">
					<Label className="p-3 flex items-center justify-between">
						<div className="gap-1 flex flex-col">
							<span>{t(getKey('autoApplyConfig.enabled.label'))}</span>
							<p className="text-sm text-foreground-muted">
								{t(getKey('autoApplyConfig.enabled.description'))}
							</p>
						</div>

						<RawSwitch
							id="autoApplyEnabled"
							className="data-[state=checked]:bg-fill-brand-secondary/60 data-[state=unchecked]:bg-fill-brand-secondary"
							checked={autoApplyEnabled ?? true}
							onCheckedChange={(checked) => form.setValue('autoApplyConfig.enabled', checked)}
						/>
					</Label>
				</div>
			</div>

			<div className="gap-4 pl-1 flex flex-col">
				<div className="gap-2 flex flex-col">
					<Input
						label={t(getKey('autoApplyConfig.threshold.label'))}
						description={t(getKey('autoApplyConfig.threshold.description'))}
						variant="primary"
						type="number"
						step="0.01"
						min="0"
						max="1"
						{...form.register('autoApplyConfig.threshold', {
							valueAsNumber: true,
						})}
						errorMessage={errors.autoApplyConfig?.threshold?.message}
						disabled={!autoApplyEnabled}
					/>

					<Alert
						variant="info"
						dismissible
						id="autoApplyConfigThresholdDisclaimer"
						className={cn({
							'pointer-events-none opacity-50': !autoApplyEnabled,
						})}
					>
						<AlertDescription>{t(getKey('autoApplyConfig.threshold.disclaimer'))}</AlertDescription>
					</Alert>
				</div>

				<div className="gap-2 flex flex-col">
					<Label className={cn({ 'pointer-events-none opacity-50': !autoApplyEnabled })}>
						{t(getKey('autoApplyConfig.strategy.label'))}
					</Label>

					<NativeSelect
						options={strategyOptions}
						value={form.getValues('autoApplyConfig.strategy')}
						onChange={(e) =>
							form.setValue('autoApplyConfig.strategy', e.target.value as MergeStrategy)
						}
						disabled={!autoApplyEnabled}
					/>
				</div>
			</div>
		</>
	)
}

const LOCALE_KEY = 'settingsScene.server/metadataIntegrations.providerForm'
const getKey = (key: string) => `${LOCALE_KEY}.${key}`
