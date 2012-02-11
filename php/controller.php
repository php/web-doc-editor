<?php
/**
 * Ext JS controller file
 */

session_start();
error_reporting(E_ALL);
set_time_limit(0);

require_once "./ExtJsController.php";
require_once "./JsonResponseBuilder.php";

$controller = new ExtJsController(array_merge($_GET, $_POST));

$method     = str_replace('-', '_', $controller->getRequestVariable('task'));

if (isset($_SESSION['csrfToken']) && $controller->getRequestVariable('csrfToken') !== $_SESSION['csrfToken']) {
    $response = JsonResponseBuilder::failure(
        array(
            'msg' => 'CSRF token missing or invalid'
        )
    );
}
else if (method_exists($controller, $method)) {
    $response = $controller->$method();
} else {
    $response = JsonResponseBuilder::failure(
        array(
            'msg' => sprintf('Unknown controller action: %s', $method)
        )
    );
}

// Place here all method who already send hers headers
if (in_array($method, array('getImageContent', 'downloadPatch'))) {

    echo $response;
    exit;

}

header('Content-type: text/plain; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Content-Length:' . strlen($response));
echo $response;
exit;
