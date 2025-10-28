Pod::Spec.new do |s|
  s.name           = 'StumpStreamer'
  s.version        = '1.0.0'
  s.summary        = 'Native module for streaming pages from ZIP/CBZ archives'
  s.description    = 'Provides HTTP server-based streaming of comic book pages from ZIP/CBZ files for offline reading'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'Readium'

  # Note: I am using Readium's GCDWebServer to avoid conflicts (got a bunch of redeclaration errors otherwise)
  s.dependency 'ReadiumGCDWebServer'
  s.dependency 'ZIPFoundation', '~> 0.9'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
