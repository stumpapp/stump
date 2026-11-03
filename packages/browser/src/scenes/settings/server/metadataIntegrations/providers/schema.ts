import { EditProviderDialogFragment, MergeStrategy, MetadataProvider } from '@stump/graphql'
import z from 'zod'

const providerType = z.enum(MetadataProvider)
const mergeStrategy = z.enum(MergeStrategy)

const autoApplyConfig = z.object({
	enabled: z.boolean(),
	threshold: z.number().min(0).max(1),
	strategy: mergeStrategy,
	excludeFields: z.array(z.string()),
})

export const createConfig = z.object({
	providerType,
	enabled: z.boolean(),
	apiToken: z.string().min(1),
	apiTokenExpiresAt: z.date().nullish(),
	autoApplyConfig,
})
export type CreateProviderConfigSchema = z.infer<typeof createConfig>

export const patchConfig = z
	.object({
		enabled: z.boolean().nullish(),
		apiToken: z.string().min(1).nullish(),
		apiTokenExpiresAt: z.date().nullish(),
		autoApplyConfig: autoApplyConfig.nullish(),
	})
	.partial()
export type PatchProviderConfigSchema = z.infer<typeof patchConfig>

export const getCommonDefaults = () => ({
	enabled: true,
	apiToken: '',
	apiTokenExpiresAt: null,
	autoApplyConfig: {
		enabled: false,
		threshold: 0.95,
		strategy: MergeStrategy.FillGaps,
		excludeFields: [],
	},
})

export const getEditFormDefaults = (
	provider: EditProviderDialogFragment,
): PatchProviderConfigSchema => ({
	enabled: provider.enabled,
	apiToken: null,
	apiTokenExpiresAt: provider.apiTokenExpiresAt,
	autoApplyConfig: {
		enabled: provider.autoApplyConfig?.enabled ?? false,
		threshold: provider.autoApplyConfig?.threshold ?? 0.95,
		strategy: provider.autoApplyConfig?.strategy ?? MergeStrategy.FillGaps,
		excludeFields: provider.autoApplyConfig?.excludeFields ?? [],
	},
})
