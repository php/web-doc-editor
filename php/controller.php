<?php
/**
 * Ext JS controller file
 */

session_start();
error_reporting(E_ALL);
set_time_limit(0);

require_once "./ExtJsController.php";
require_once "./JsonResponseBuilder.php";

$controller = new ExtJsController($_REQUEST);

$method     = str_replace('-', '_', $controller->getRequestVariable('task'));

if (method_exists($controller, $method)) {
    $response = $controller->$method();
} else {
    $response = JsonResponseBuilder::failure(
        array(
            'msg' => sprintf('Unknown controller action: %s', $method)
        )
    );
}

header('Content-Length:' . strlen($response));
echo $response;
exit;
