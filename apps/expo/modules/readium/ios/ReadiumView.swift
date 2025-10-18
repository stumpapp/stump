 import ExpoModulesCore
 import WebKit

 // This view will be used as a native component. Make sure to inherit from `ExpoView`
 // to apply the proper styling (e.g. border radius and shadows).
 class ReadiumView: ExpoView {
     let webView = WKWebView()
     let onLoad = EventDispatcher()
     var delegate: WebViewDelegate?

     required init(appContext: AppContext? = nil) {
         super.init(appContext: appContext)
         clipsToBounds = true
         delegate = WebViewDelegate { [weak self] url in
             self?.onLoad(["url": url])
         }
         webView.navigationDelegate = delegate
         addSubview(webView)
     }
     
     deinit {
         print("ReadiumView: deinit - cleaning up WKWebView")
         webView.stopLoading()
         webView.navigationDelegate = nil
         webView.removeFromSuperview()
     }

     override func layoutSubviews() {
         webView.frame = bounds
     }
 }

 class WebViewDelegate: NSObject, WKNavigationDelegate {
     let onUrlChange: (String) -> Void

     init(onUrlChange: @escaping (String) -> Void) {
         self.onUrlChange = onUrlChange
     }

     func webView(_ webView: WKWebView, didFinish _: WKNavigation) {
         if let url = webView.url {
             onUrlChange(url.absoluteString)
         }
     }
 }
