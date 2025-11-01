Pod::Spec.new do |s|
  s.name           = 'Readium'
  s.version        = '1.0.0'
  s.summary        = 'EPUB reader module using Readium'
  s.description    = 'A React Native module for reading EPUB files using the Readium SDK'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true
  
  s.dependency 'ExpoModulesCore'
  
  s.dependency 'ExpoModulesCore'
  s.dependency 'ReadiumShared'
  s.dependency 'ReadiumStreamer'
  s.dependency 'ReadiumNavigator'
  s.dependency 'ReadiumOPDS'
  s.dependency 'ReadiumInternal'
  s.dependency 'ReadiumAdapterGCDWebServer'
  s.dependency 'OrderedCollections'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
