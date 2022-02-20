import { baseUrl } from '.';

export function login(username: string, password: string) {
    return fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ username, password })
    });
}
