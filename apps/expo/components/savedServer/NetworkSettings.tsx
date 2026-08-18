// TODO: i need to consider overall flow before investing the time to build this out
// each server (opds, stump) kind will re-use this, but each server has different layouts
// generally. i also think it makes sense to expose as part of creation, however that
// complicates things since we don't have a fully-resolved SavedServer to operate on
// AH okay dump ahead:
// starting with stump because selfish (not rly just easiest) i imagine probably adding a user
// menu to home (stump/id/index) that exposes a user settings and server settings(?)
// user settings we can ignore, just feels sensical if bound to avatar menu, but server settings
// is interesting. maybe it's just "settings" and we merge user settings and server settings into
// a single sheet? i don't think we need to just spin up the edit server dialog, in part because
// i don't want to expose editing things like auth while actively inside the server.
// maybe just standard flavor card list with `Network` as a row which launches this here thing
// in its own sheet which shows:
// - the cannonical url (what you configured the server with)
// - enablement of local profile (either derived from truthy localProfile or an explicit opt-in to support
// having the config but turning it off for whatever reason)
// - input for local profile url (if enabled) with a button to test the connection
// - button to swap URLs (e.g., if i configed as local but want to swap to remote, or vice versa)
// - section to pick the wifi ssid to go with local url (if enabled, and perms granted)
// - some kind of overview that shows:
//    - current network (wifi, etc)
//    - current url (local vs remote)
// in part this is a bit streamyfin-pilled since that is the only prior art i have but is okie
export function NetworkSettings() {
	return null
}
