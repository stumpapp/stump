import { ReadProgress } from '@stump/core';
import API from '..';

export function updateMediaProgress(id: string, page: number): Promise<ReadProgress> {
	return API.put(`/media/${id}/progress/${page}`);
}
