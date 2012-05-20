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


    require_once 'php/AuthServices.php';
    $auth = new AuthServices();

    if ( isset($_GET['code']) && isset($_GET['state']) ) {
        $auth->auth($_GET['state']);
    }

    if (isset($_GET['code']) || isset($_GET['error'])) {
        // FIXME: fb api add "#_=_" after uri
        $redirect = 'http://' . $_SERVER['HTTP_HOST'] . $_SERVER['PHP_SELF'];
        header('Location: ' . filter_var($redirect, FILTER_SANITIZE_URL));
        die;
    }


    $jsVar .= 'var googleAuthUrl = "'.$auth->getAuthUrl(AuthServices::GOOGLE).'";';
    $jsVar .= 'var FBAuthUrl = "'.$auth->getAuthUrl(AuthServices::FACEBOOK).'";';
    $jsVar .= 'var csrfToken = null;';

    echo headerTemplate();
    //echo cssLoadTemplate('themes/login-all.css');
    echo cssLoadTemplate('extjs/resources/css/ext-all.css');
    echo cssLoadTemplate('themes/login.css');
    echo cssLoadTemplate('themes/flags.css');
    echo jsCallTemplate($jsVar);
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading Core API...";');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading UI Components...";');
    echo jsLoadTemplate('extjs/ext-debug.js');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initializing...";');
    echo jsLoadTemplate('js/login.js');
    echo footerTemplate();
    exit;
}

echo headerTemplate();
echo cssLoadTemplate('extjs/resources/css/ext-all.css', 'extTheme');
echo cssLoadTemplate('themes/icon.css', 'extTheme');
echo cssLoadTemplate('themes/flags.css');
//echo cssLoadTemplate('themes/empty.css', 'appTheme');
echo cssLoadTemplate('themes/main.css');
echo jsCallTemplate($jsVar);
echo jsCallTemplate('var csrfToken = "' . $_SESSION['csrfToken'] . '";');

// ExtJs Javascript core files
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading Core API...";');
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading UI Components...";');
echo jsLoadTemplate('extjs/ext-debug.js');
//echo jsLoadTemplate('extjs/locale/ext-lang-ru.js');
//echo jsLoadTemplate('js/locale/lang-en.js');

// Ext.ux Javascript files
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initializing...";');
echo jsLoadi18nTemplate();
echo jsLoadTemplate('js/main.js');
echo footerTemplate();
?>
