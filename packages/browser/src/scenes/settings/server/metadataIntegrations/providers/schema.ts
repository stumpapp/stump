import {
	CreateMetadataProviderConfigInput,
	ExistingProviderCardFragment,
	MergeStrategy,
	MetadataProvider,
	PatchMetadataProviderConfigInput,
} from '@stump/graphql'
import z from 'zod'

const providerType = z.nativeEnum(MetadataProvider)
const mergeStrategy = z.nativeEnum(MergeStrategy)

const autoApplyConfig = z.object({
	enabled: z.boolean().default(false),
	threshold: z.number().min(0).max(1).default(0.95),
	strategy: mergeStrategy.default(MergeStrategy.FillGaps),
	excludeFields: z.array(z.string()).default([]),
})

export const createConfig = z
	.object({
		providerType,
		enabled: z.boolean().default(true),
		apiToken: z.string().min(1),
		apiTokenExpiresAt: z.date().nullish(),
		autoApplyConfig,
	})
	//  Note: I don't _think_ this has perf implications, but ensures the form
	// will stay in sync with CreateMetadataProviderConfigInput
	.transform((data) => data satisfies CreateMetadataProviderConfigInput)
export type CreateProviderConfigSchema = z.infer<typeof createConfig>

export const patchConfig = z
	.object({
		enabled: z.boolean().nullish(),
		apiToken: z.string().min(1).nullish(),
		apiTokenExpiresAt: z.date().nullish(),
		autoApplyConfig: autoApplyConfig.nullish(),
	})
	.partial()
	// Note: I don't _think_ this has perf implications, but ensures the form
	// will stay in sync with PatchMetadataProviderConfigInput
	.transform((data) => data satisfies PatchMetadataProviderConfigInput)
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

export const getPatchDefaults = (
	provider: ExistingProviderCardFragment,
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
