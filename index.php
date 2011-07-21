<?php

session_start();

require_once './php/html.templates.php';

// Perm link management
if (isset($_REQUEST['perm'])) {

    $perm = trim($_REQUEST['perm'], '/ ');
    
    if( substr($perm, -4) == '.php' )
    {
        require_once dirname(__FILE__) . '/php/ProjectManager.php';
        require_once dirname(__FILE__) . '/php/RepositoryFetcher.php';

        $_project = $_REQUEST['project'];

        // Set the project
        ProjectManager::getInstance()->setProject($_project);

        $_p    = explode('/', $perm);
        $_lang = array_shift($_p);
        $_file = array_pop($_p);

        $_id   = explode('.', $_file);
        array_pop($_id);
        $xmlid = implode('.', $_id);

        $r = RepositoryFetcher::getInstance()->getFileByXmlID($_lang, $xmlid);

        if ( $r ) {
            $jsVar = 'var directAccess = {"link":"perm", "lang":"'.$r->lang.'", "path":"'.$r->path.'", "name":"'.$r->name.'", "project":"'.$_project.'"};';
        } else {
            $jsVar = 'var directAccess = false;';
        }
    } else {
        $jsVar = 'var directAccess = false;';
    }

} else if (isset($_REQUEST['patch'])) {

    $patch = trim($_REQUEST['patch'], '/ ');
    $_project = $_REQUEST['project'];

    require_once dirname(__FILE__) . '/php/ProjectManager.php';

    // Set the project
    ProjectManager::getInstance()->setProject($_project);
    
    $_patch = explode('/', $patch);
    $fileName = $_patch[count($_patch)-1];
    $filePath = substr($patch, 0, (strlen($patch)-strlen($fileName)));
    
    $jsVar = 'var directAccess = {"link":"patch", "lang":"en", "path":"'.htmlspecialchars($filePath).'", "name":"'.htmlspecialchars($fileName).'", "project":"'.htmlspecialchars($_project).'"};';

} else if (isset($_REQUEST['patchID'])) {

    $patchID = trim($_REQUEST['patchID'], '/ ');
    $_project = $_REQUEST['project'];

    require_once dirname(__FILE__) . '/php/ProjectManager.php';
    require_once dirname(__FILE__) . '/php/RepositoryManager.php';

    // Set the project
    ProjectManager::getInstance()->setProject($_project);
    
    $patchInfo = RepositoryManager::getInstance()->getPatchInfo($patchID);
    
    $jsVar = 'var directAccess = {"link":"patchID", "lang":"en", "patchID":"'.htmlspecialchars($patchID).'", "patchName":"'.htmlspecialchars($patchInfo->name).'", "project":"'.htmlspecialchars($_project).'"};';

} else {
    $jsVar = 'var directAccess = false;';
}

// Log the user in if needed
if (!isset($_SESSION['userID'])) {

    echo headerTemplate();
    echo cssLoadTemplate('js/ExtJs/resources/css/ext-all.css');
    echo cssLoadTemplate('themes/login-all.css');
    echo jsCallTemplate($jsVar);
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading Core API...";');
    
    // Facebook
    echo jsLoadTemplate('https://connect.facebook.net/en_US/all.js');
    
    // Twitter
    //echo jsLoadTemplate('http://platform.twitter.com/anywhere.js?id=2hlkdhcRZG8W6jz1LkEAQ&v=1');
    
    //Google
    echo jsLoadTemplate('https://www.google.com/jsapi');
    echo jsCallTemplate("google.load('friendconnect', '0.8');");
    
    
    echo jsLoadTemplate('js/ExtJs/adapter/ext/ext-base.js');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading UI Components...";');
    echo jsLoadTemplate('js/ExtJs/ext-all.js');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initializing...";');
    echo jsLoadTemplate('js/login-all.js');
    echo footerTemplate();
    exit;
}

echo headerTemplate();
echo cssLoadTemplate('js/ExtJs/resources/css/ext-all.css', 'extTheme');
echo cssLoadTemplate('themes/empty.css', 'appTheme');
echo cssLoadTemplate('themes/main-all.css');

echo jsCallTemplate($jsVar);
echo jsCallTemplate('var csrfToken = "' . $_SESSION['csrfToken'] . '";');

// ExtJs Javascript core files
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading Core API...";');
echo jsLoadTemplate('js/ExtJs/adapter/ext/ext-base.js');
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading UI Components...";');
echo jsLoadTemplate('js/ExtJs/ext-all.js');

// Ext.ux Javascript files
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initializing...";');
echo jsLoadi18nTemplate();
echo jsLoadTemplate('js/ux/codemirror/js/codemirror.js');
echo jsLoadTemplate('js/main-all.js');
echo footerTemplate();

?>
