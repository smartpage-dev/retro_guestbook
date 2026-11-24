"""Source-level guard for AndroidX WebViewClientCompat final overload.
This does not replace Android SDK compilation.
"""
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'android/app/src/main/java/studio/luce/retrobooth/MainActivity.java'
s=p.read_text()
assert 'import androidx.webkit.WebResourceErrorCompat;' in s
assert 'onReceivedError(WebView view,WebResourceRequest request,WebResourceErrorCompat error)' in s
assert 'onReceivedError(WebView view,WebResourceRequest request,WebResourceError error)' not in s
assert 'if(request.isForMainFrame())nativeDiag("webview_mainframe_error","code_"+error.getErrorCode());' in s
print('PASS: AndroidX-compatible WebView error callback signature; native SDK compilation still required')
