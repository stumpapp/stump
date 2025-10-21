// Reexport the native module. On web, it will be resolved to StumpStreamerModule.web.ts
// and on native platforms to StumpStreamerModule.ts
export * from './src/StumpStreamer.types'
export { default } from './src/StumpStreamerModule'
