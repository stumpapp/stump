import * as library from './library';
import * as series from './series';
import * as media from './media';

// FIXME: svelte needs to be able to ping the endpoint in order to build. smh...
// export const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:6969';
export const baseUrl: string = (import.meta.env.API_URI as string) ?? 'http://localhost:6969';

export default {
    library,
    series,
    media
};
