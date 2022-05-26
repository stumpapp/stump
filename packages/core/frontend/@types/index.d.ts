// Probably won't use this lol sometimes I just mix the languages
type Option<T> = T | undefined | null;

type ApiResult<T, E = any> = import('axios').AxiosResponse<T, E>;
