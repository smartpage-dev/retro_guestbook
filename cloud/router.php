<?php
// Local test server only. Never expose this PHP development server to the Internet.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
$full=realpath(__DIR__.'/public_html'.$path);$root=realpath(__DIR__.'/public_html');
if ($full && str_starts_with($full,$root.'/') && is_file($full) && preg_match('/\.(css|js|html|png|txt)$/D',$full)) return false;
require __DIR__.'/public_html/index.php';
