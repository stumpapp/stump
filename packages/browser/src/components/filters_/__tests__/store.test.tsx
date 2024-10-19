import {
	isLibraryOrderBy,
	isMediaMetadataOrderBy,
	isMediaOrderBy,
	isSeriesMetadataOrderBy,
	isSeriesOrderBy,
	LibraryOrderBy,
	LibrarySmartFilter,
	MediaMetadataOrderBy,
	MediaMetadataSmartFilter,
	MediaOrderBy,
	MediaSmartFilter,
	SeriesMetadataOrderBy,
	SeriesMetadataSmartFilter,
	SeriesOrderBy,
	SeriesSmartFilter,
} from '@stump/sdk'

import { intoFormGroup } from '@/components/smartList/createOrUpdate'

import { intoBody } from '../store'

describe('FilterStore', () => {
	describe('intoBody', () => {
		it('should convert for no filters properly', () => {
			const bodyFilter = intoBody<MediaSmartFilter, MediaOrderBy>(
				{
					forEntity: 'media',
					pagination: {
						page: 1,
						page_size: 20,
					},
				},
				isMediaOrderBy,
			)
			expect(bodyFilter.filters).toBeUndefined()
			expect(bodyFilter.order_params).toBeUndefined()
			expect(bodyFilter.query).toEqual({
				page: 1,
				page_size: 20,
			})
		})

		it('should convert media smart filter form for media body filter', () => {
			const formGroup = intoFormGroup({
				and: [
					{
						name: {
							any: ['foo', 'shmoo'],
						},
					} satisfies MediaSmartFilter,
					{
						name: {
							none: ['bar', 'baz'],
						},
					} satisfies MediaSmartFilter,
				],
			})
			const bodyFilter = intoBody<MediaSmartFilter, MediaOrderBy>(
				{
					filters: [formGroup],
					forEntity: 'media',
					pagination: {
						page: 1,
						page_size: 20,
					},
				},
				isMediaOrderBy,
			)
			expect(bodyFilter.filters).toEqual([
				{
					and: [
						{
							name: {
								any: ['foo', 'shmoo'],
							},
						},
						{
							name: {
								none: ['bar', 'baz'],
							},
						},
					],
				},
			])
			expect(bodyFilter.order_params).toBeUndefined()
			expect(bodyFilter.query).toEqual({
				page: 1,
				page_size: 20,
			})
		})

		it('should filter out any non-media order by fields for media body filter', () => {
			const bodyFilter = intoBody<MediaSmartFilter, MediaOrderBy>(
				{
					forEntity: 'media',
					ordering: [
						{
							direction: 'desc',
							order_by: 'name' satisfies MediaOrderBy,
						},
						{
							direction: 'desc',
							order_by: 'foo',
						},
					],
					pagination: {
						page: 1,
						page_size: 20,
					},
				},
				isMediaOrderBy,
			)
			expect(bodyFilter.order_params).toEqual([
				{
					direction: 'desc',
					order_by: 'name',
				},
			])
		})

		it('should convert media smart filter form for media_metadata body filter', () => {
			const formGroup = intoFormGroup({
				and: [
					{
						metadata: {
							title: {
								any: ['foo', 'shmoo'],
							},
						},
					} satisfies MediaSmartFilter,
				],
			})

			const bodyFilter = intoBody<MediaMetadataSmartFilter, MediaMetadataOrderBy>(
				{
					filters: [formGroup],
					forEntity: 'media_metadata',
					pagination: {
						page: 1,
						page_size: 20,
					},
				},
				isMediaMetadataOrderBy,
			)
			expect(bodyFilter.filters).toEqual([
				{
					and: [
						{
							title: {
								any: ['foo', 'shmoo'],
							},
						},
					],
				},
			])
			expect(bodyFilter.order_params).toBeUndefined()
			expect(bodyFilter.query).toEqual({
				page: 1,
				page_size: 20,
			})
		})

		it('should filter out any non-media_metadata order by fields for media_metadata body filter', () => {
			const bodyFilter = intoBody<MediaMetadataSmartFilter, MediaMetadataOrderBy>(
				{
					forEntity: 'media_metadata',
					ordering: [
						{
							direction: 'desc',
							order_by: 'title' satisfies MediaMetadataOrderBy,
						},
						{
							direction: 'desc',
							order_by: 'foo',
						},
					],
					pagination: {
						page: 1,
						page_size: 20,
					},
				},
				isMediaMetadataOrderBy,
			)
			expect(bodyFilter.order_params).toEqual([
				{
					direction: 'desc',
					order_by: 'title',
				},
			])
		})

		it('should convert media smart filter form for series body filter', () => {
			const formGroup = intoFormGroup({
				and: [
					{
						series: {
							name: {
								any: ['foo', 'shmoo'],
							},
						},
					} satisfies MediaSmartFilter,
				],
			})

			const bodyFilter = intoBody<SeriesSmartFilter, SeriesOrderBy>(
				{
					filters: [formGroup],
					forEntity: 'series',
					pagination: {
						page: 1,
						page_size: 20,
					},
				},
				isSeriesOrderBy,
			)

			expect(bodyFilter.filters).toEqual([
				{
					and: [
						{
							name: {
								any: ['foo', 'shmoo'],
							},
						},
					],
				},
			])
			expect(bodyFilter.order_params).toBeUndefined()
			expect(bodyFilter.query).toEqual({
				page: 1,
				page_size: 20,
			})
		})

		it('should filter out any non-series order by fields for series body filter', () => {
			const bodyFilter = intoBody<SeriesSmartFilter, SeriesOrderBy>(
				{
					forEntity: 'series',
					ordering: [
						{
							direction: 'desc',
							order_by: 'name' satisfies SeriesOrderBy,
						},
						{
							direction: 'desc',
							order_by: 'foo',
						},
					],
					pagination: {
						page: 1,
						page_size: 20,
					},
				},
				isSeriesOrderBy,
			)
			expect(bodyFilter.order_params).toEqual([
				{
					direction: 'desc',
					order_by: 'name',
				},
			])
		})

		it('should convert media smart filter form for series_metadata body filter', () => {
			const formGroup = intoFormGroup({
				and: [
					{
						series: {
							metadata: {
								title: {
									any: ['foo', 'shmoo'],
								},
							},
						},
					} satisfies MediaSmartFilter,
				],
			})

			const bodyFilter = intoBody<SeriesMetadataSmartFilter, SeriesMetadataOrderBy>(
				{
					filters: [formGroup],
					forEntity: 'series_metadata',
					pagination: {
						page: 1,
						page_size: 20,
					},
				},
				isSeriesMetadataOrderBy,
			)

			expect(bodyFilter.filters).toEqual([
				{
					and: [
						{
							title: {
								any: ['foo', 'shmoo'],
							},
						},
					],
				},
			])
			expect(bodyFilter.order_params).toBeUndefined()
			expect(bodyFilter.query).toEqual({
				page: 1,
				page_size: 20,
			})
		})

		it('should filter out any non-series_metadata order by fields for series_metadata body filter', () => {
			const bodyFilter = intoBody<SeriesMetadataSmartFilter, SeriesMetadataOrderBy>(
				{
					forEntity: 'series_metadata',
					ordering: [
						{
							direction: 'desc',
							order_by: 'title' satisfies SeriesMetadataOrderBy,
						},
						{
							direction: 'desc',
							order_by: 'foo',
						},
					],
					pagination: {
						page: 1,
						page_size: 20,
					},
				},
				isSeriesMetadataOrderBy,
			)
			expect(bodyFilter.order_params).toEqual([
				{
					direction: 'desc',
					order_by: 'title',
				},
			])
		})

		it('should convert media smart filter form for library body filter', () => {
			const formGroup = intoFormGroup({
				and: [
					{
						series: {
							library: {
								updated_at: {
									from: '2021-01-01T00:00:00Z',
									inclusive: true,
									to: '2021-01-02T00:00:00Z',
								},
							},
						},
					} satisfies MediaSmartFilter,
				],
			})

			const bodyFilter = intoBody<LibrarySmartFilter, LibraryOrderBy>(
				{
					filters: [formGroup],
					forEntity: 'library',
					pagination: {
						page: 1,
						page_size: 20,
					},
				},
				isLibraryOrderBy,
			)

			expect(bodyFilter.filters).toEqual([
				{
					and: [
						{
							updated_at: {
								from: '2021-01-01T00:00:00Z',
								inclusive: true,
								to: '2021-01-02T00:00:00Z',
							},
						},
					],
				},
			])
			expect(bodyFilter.order_params).toBeUndefined()
			expect(bodyFilter.query).toEqual({
				page: 1,
				page_size: 20,
			})
		})

		it('should filter out any non-library order by fields for library body filter', () => {
			const bodyFilter = intoBody<LibrarySmartFilter, LibraryOrderBy>(
				{
					forEntity: 'library',
					ordering: [
						{
							direction: 'desc',
							order_by: 'updated_at' satisfies LibraryOrderBy,
						},
						{
							direction: 'desc',
							order_by: 'foo',
						},
					],
					pagination: {
						page: 1,
						page_size: 20,
					},
				},
				isLibraryOrderBy,
			)
			expect(bodyFilter.order_params).toEqual([
				{
					direction: 'desc',
					order_by: 'updated_at',
				},
			])
		})
	})
})
