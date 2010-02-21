<?php

session_start();

require_once './php/html.templates.php';

// Perm link management
if (isset($_REQUEST['perm'])) {

    require_once dirname(__FILE__) . '/php/ProjectManager.php';
    require_once dirname(__FILE__) . '/php/RepositoryFetcher.php';

    $_project = $_REQUEST['project'];

    // Set the project
    ProjectManager::getInstance()->setProject($_project);

    $_p    = explode('/', trim($_REQUEST['perm'], '/'));
    $_lang = array_shift($_p);
    $_file = array_pop($_p);

    $_id   = explode('.', $_file);
    array_pop($_id);
    $xmlid = implode('.', $_id);

    $r = RepositoryFetcher::getInstance()->getFileByXmlID($_lang, $xmlid);

    if (false == is_null($r)) {
        $directAccess = 'var directAccess = {"lang":"'.$r->lang.'", "path":"'.$r->path.'", "name":"'.$r->name.'", "project":"'.$_project.'"};';
    } else {
        $directAccess = 'var directAccess = false;';
    }

} else {
    $directAccess = 'var directAccess = false;';
}


// Log the user in if needed
if (!isset($_SESSION['userID'])) {
    echo headerTemplate();
    echo cssLoadTemplate('http://extjs.cachefly.net/ext-3.1.1/resources/css/ext-all.css');
    echo cssLoadTemplate('themes/login-all.css');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading Core API...";');
    echo jsLoadTemplate('http://extjs.cachefly.net/ext-3.1.1/adapter/ext/ext-base.js');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading UI Components...";');
    echo jsLoadTemplate('http://extjs.cachefly.net/ext-3.1.1/ext-all.js');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initializing...";');
    echo jsLoadTemplate('js/login-all.js');
    echo jsCallTemplate($directAccess);
    echo footerTemplate();
    exit;
}

echo headerTemplate();
echo cssLoadTemplate('http://extjs.cachefly.net/ext-3.1.1/resources/css/ext-all.css', 'extTheme');
echo cssLoadTemplate('themes/empty.css', 'appTheme');
echo cssLoadTemplate('themes/main-all.css');

// ExtJs Javascript core files
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading Core API...";');
echo jsLoadTemplate('http://extjs.cachefly.net/ext-3.1.1/adapter/ext/ext-base.js');
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading UI Components...";');
echo jsLoadTemplate('http://extjs.cachefly.net/ext-3.1.1/ext-all.js');

// Ext.ux Javascript files
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initializing...";');
echo jsLoadi18nTemplate();
echo jsLoadTemplate('js/ux/codemirror/js/codemirror.js');
echo jsLoadTemplate('js/main-all.js');
echo jsCallTemplate($directAccess);
echo footerTemplate();

?>
