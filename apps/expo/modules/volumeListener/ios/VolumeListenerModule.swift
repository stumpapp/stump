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
// 3. related to 1, the volume can drift a bit if pressed repeatedly and quickly. also, we clamp
//    the reset target (safeVolume) to [1/16, 15/16] to avoid issues where the obesrver doesn't fire

public class VolumeListenerModule: Module {
    private var volumeObservation: NSKeyValueObservation?
    /// we have to render an offscreen MPVolumeView to:
    /// 1. prevent the system volume HUD from appearing on every button press
    /// 2. be able to reset the volume back to our captured level after every button
    private var volumeView: MPVolumeView?
    /// the volume level at listening start time, which will be used to at listening end
    private var originalVolume: Float = 0.5
    /// the "safe" volume level to reset to after each press. this is pretty finicky and annoying
    /// to get right, iOS won't register changes at the min/max so need to coerce into some kind
    /// of middle ground while still respecting the user's original level as much as possible.
    /// it won't be a perfect experience, honestly
    private var safeVolume: Float = 0.5
    /// a terrible fix for an irritating problem: when we programmatically reset the volume after a press
    /// it will re-trigger the observer, causing a feedback loop. when true, the observer will ignore events
    /// because of that. shitty. annoying. WHATEVER
    private var isResetting = false

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

        originalVolume = AVAudioSession.sharedInstance().outputVolume

        // it took me 16 clicks to get from muted (0) to max volume (1) on my phone. i am going
        // to assume that is standard and use it as the base for calculating a "safe" volume to
        // reset to after each press
        let step: Float = 1.0 / 16.0
        safeVolume = min(max(originalVolume, step), 1.0 - step)

        setupVolumeView()
        // called to ensure we don't start at e.g. 0 or 1, which would break the experience immediately
        // also tho if you frequent max volume, that's wild and i'm worried about you
        resetVolume()

        volumeObservation = AVAudioSession.sharedInstance().observe(
            \.outputVolume,
            options: [.old, .new]
        ) { [weak self] _, change in
            guard let self,
                let oldValue = change.oldValue,
                let newValue = change.newValue
            else { return }

            guard !self.isResetting else {
                print(
                    "volume event ignored (isResetting), old=\(oldValue) new=\(newValue) safe=\(self.safeVolume)"
                )
                return
            }

            if newValue > oldValue {
                self.sendEvent("onVolumeUp")
            } else if newValue < oldValue {
                self.sendEvent("onVolumeDown")
            } else {
                // old == new, shouldn't even happen?
                return
            }

            self.isResetting = true
            self.resetVolume()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
                print("clearing volume isResetting flag to allow future events...")
                self?.isResetting = false
            }
        }
    }

    private func stopListening() {
        volumeObservation?.invalidate()
        volumeObservation = nil
        isResetting = false
        if let slider = volumeView?.subviews.first(where: { $0 is UISlider }) as? UISlider {
            slider.value = originalVolume
        }
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
        DispatchQueue.main.async {
            print(
                "setting slider to \(self.safeVolume) (was \(slider.value))"
            )
            slider.value = self.safeVolume
        }
    }
}
