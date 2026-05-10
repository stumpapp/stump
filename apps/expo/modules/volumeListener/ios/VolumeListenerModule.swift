import AVFoundation
import ExpoModulesCore
import MediaPlayer

// there were a couple of notable hacks and sacrifices which were made to get this working, which
// were not required for android:
//
// 1. we cannot prevent the volume event from actually changing the volume, we can only capture and
//    quickly reset it back. this also (very annoyingly) cannot be tested in a simulator
// 2. to prevent the system volume hud from appearing on every button press, we render a tiny,
//    fully transparent MPVolumeView offscreen. this also allows us to actually reset the volume,
//    since AVAudioSession.outputVolume is read-only
// 3. related to 1, the volume can drift a bit if pressed repeatedly and quickly

public class VolumeListenerModule: Module {
    private var volumeObservation: NSKeyValueObservation?
    /// we have to render an offscreen MPVolumeView to:
    /// 1. prevent the system volume HUD from appearing on every button press
    /// 2. be able to reset the volume back to our captured level after every button
    private var volumeView: MPVolumeView?
    /// the volume level at listening start time, which will be used to reset after each button press
    private var capturedVolume: Float = 0.5

    public func definition() -> ModuleDefinition {
        Name("VolumeListener")

        Events("onVolumeUp", "onVolumeDown")

        Function("startListening") {
            DispatchQueue.main.async {
                self.startListening()
            }
        }

        Function("stopListening") {
            DispatchQueue.main.async {
                self.stopListening()
            }
        }

        OnDestroy {
            DispatchQueue.main.async { [weak self] in
                self?.stopListening()
            }
        }
    }

    private func startListening() {
        guard volumeObservation == nil else { return }

        do {
            // .ambient --> https://developer.apple.com/documentation/AVFAudio/AVAudioSession/Category-swift.struct/ambient
            try AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("[VolumeListener] Failed to configure AVAudioSession: \(error)")
        }

        capturedVolume = AVAudioSession.sharedInstance().outputVolume

        setupVolumeView()

        volumeObservation = AVAudioSession.sharedInstance().observe(
            \.outputVolume,
            options: [.old, .new]
        ) { [weak self] _, change in
            guard let self,
                let oldValue = change.oldValue,
                let newValue = change.newValue
            else { return }

            if newValue > oldValue {
                self.sendEvent("onVolumeUp")
            } else if newValue < oldValue {
                self.sendEvent("onVolumeDown")
            }

            self.resetVolume()
        }
    }

    private func stopListening() {
        volumeObservation?.invalidate()
        volumeObservation = nil
        teardownVolumeView()
    }

    private func setupVolumeView() {
        guard volumeView == nil else { return }

        let frame = CGRect(x: -1000, y: -1000, width: 1, height: 1)
        let view = MPVolumeView(frame: frame)
        // setting alpha to 0 doesn't work, should be fine
        view.alpha = 0.001

        let window = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }?
            .windows
            .first { $0.isKeyWindow }

        window?.addSubview(view)
        volumeView = view
    }

    private func teardownVolumeView() {
        volumeView?.removeFromSuperview()
        volumeView = nil
    }

    private func resetVolume() {
        // we grab the slider to programmatically reset it back, since there is no public api i saw to set it directly.
        // kinda really stinky but w/e
        guard let slider = volumeView?.subviews.first(where: { $0 is UISlider }) as? UISlider else {
            return
        }
        let target = capturedVolume
        DispatchQueue.main.async {
            slider.value = target
        }
    }
}
