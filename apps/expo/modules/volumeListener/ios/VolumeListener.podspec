Pod::Spec.new do |s|
  s.name           = 'VolumeListener'
  s.version        = '1.0.0'
  s.summary        = 'Native module for intercepting hardware volume button presses'
  s.description    = 'Observes AVAudioSession.outputVolume and fires JS events for volume changes'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
    :tvos => '15.1'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.frameworks = 'AVFoundation', 'MediaPlayer'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
