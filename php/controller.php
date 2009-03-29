<?php
/**
 * Ext JS controller file
 */

session_start();
error_reporting(E_ALL);

require_once "./class.php";
require_once "./ExtJsController.php";

$controller = new ExtJsController($_REQUEST);

$method     = str_replace('-', '_', $controller->getRequestVariable('task'));

if (method_exists($controller, $method)) {
    $response = $controller->$method();
} else {
    $response = $controller->getFailure(sprintf('Unknown controller action: %s', $method));
}

header('Content-Length:' . strlen($response));
echo $response;
exit;