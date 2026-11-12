import UIKit
import WebKit

final class KeyboardViewController: UIInputViewController, WKScriptMessageHandler, WKNavigationDelegate {
    private var webView: WKWebView?

    override func viewDidLoad() {
        super.viewDidLoad()
        let height = view.heightAnchor.constraint(equalToConstant: 336)
        height.priority = UILayoutPriority(999)
        height.isActive = true

        let controller = WKUserContentController()
        controller.add(self, name: "salees")
        let config = WKWebViewConfiguration()
        config.userContentController = controller

        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.scrollView.isScrollEnabled = false
        web.isOpaque = false
        web.backgroundColor = UIColor(red: 0.07, green: 0.07, blue: 0.08, alpha: 1)
        web.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(web)
        NSLayoutConstraint.activate([
            web.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            web.topAnchor.constraint(equalTo: view.topAnchor),
            web.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        webView = web

        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") {
            web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "salees", let body = message.body as? [String: Any] else { return }
        let delete = body["delete"] as? Int ?? 0
        let insert = body["insert"] as? String ?? ""
        if let selected = textDocumentProxy.selectedText, !selected.isEmpty {
            textDocumentProxy.deleteBackward()
        }
        for _ in 0..<max(0, delete) {
            textDocumentProxy.deleteBackward()
        }
        if !insert.isEmpty {
            textDocumentProxy.insertText(insert)
        }
        syncHost()
    }

    override func textDidChange(_ textInput: UITextInput?) {
        super.textDidChange(textInput)
        syncHost()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        syncHost()
    }

    private func syncHost() {
        let before = textDocumentProxy.documentContextBeforeInput ?? ""
        let after = textDocumentProxy.documentContextAfterInput ?? ""
        guard
            let data = try? JSONSerialization.data(withJSONObject: ["before": before, "after": after]),
            let json = String(data: data, encoding: .utf8)
        else { return }
        webView?.evaluateJavaScript("window.__saleesHost && window.__saleesHost(\(json))")
    }
}
