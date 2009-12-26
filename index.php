<?php

session_start();

require_once './php/html.templates.php';

// Log the user in if needed
if (!isset($_SESSION['userID'])) {
    echo headerTemplate();
    echo cssLoadTemplate('js/extjs/resources/css/ext-all.css');
    echo cssLoadTemplate('themes/login-all.css');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading Core API...";');
    echo jsLoadTemplate('js/extjs/adapter/ext/ext-base.js');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading UI Components...";');
    echo jsLoadTemplate('js/extjs/ext-all.js');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initializing...";');
    echo jsLoadTemplate('js/login-all.js');
    echo footerTemplate();
    exit;
}

echo headerTemplate();
echo cssLoadTemplate('js/extjs/resources/css/ext-all.css', 'extTheme');
echo cssLoadTemplate('themes/empty.css', 'appTheme');
echo cssLoadTemplate('themes/main-all.css');

// ExtJs Javascript core files
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading Core API...";');
echo jsLoadTemplate('js/extjs/adapter/ext/ext-base.js');
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading UI Components...";');
echo jsLoadTemplate('js/extjs/ext-all.js');

// Ext.ux Javascript files
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initializing...";');
echo jsLoadTemplate('js/ux/codemirror/js/codemirror.js');
echo jsLoadTemplate('js/main-all.js');

if (isset($_REQUEST['perm'])) {
    require_once dirname(__FILE__) . '/php/RepositoryFetcher.php';

    $_p    = explode('/', trim($_REQUEST['perm'], '/'));
    $_lang = array_shift($_p);
    $_file = array_pop($_p);

    $_id   = explode('.', $_file);
    array_pop($_id);
    $xmlid = implode('.', $_id);

    $r = RepositoryFetcher::getInstance()->getFileByXmlID($_lang, $xmlid);

    $directAccess = 'var directAccess = {"lang":"'.$r->lang.'", "path":"'.$r->path.'", "name":"'.$r->name.'"};';

} else {
    $directAccess = 'var directAccess = false;';
}
echo jsCallTemplate($directAccess);

echo footerTemplate();

?>
