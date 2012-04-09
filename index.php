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

// Init FB var
$jsVar .= "\nvar FB = false, googleInfo = false;\n";

// Log the user in if needed
if (!isset($_SESSION['userID']))
{
    // Google API
    require_once 'php/google-api-php-client/src/apiClient.php';
    require_once 'php/google-api-php-client/src/contrib/apiOauth2Service.php';
    
    $client = new apiClient();
    $client->setApplicationName("PhDOE : Php Docbook Online Editor");
    $client->setClientId('100526866357.apps.googleusercontent.com');
    $client->setClientSecret('FcKf36077Rco6S2xvdad9-WG');
    $client->setRedirectUri('https://edit.php.net/');
    $client->setState('googleAPI');

    $oauth2 = new apiOauth2Service($client);

    if ( isset($_GET['code']) && isset($_GET['state']) &&  $_GET['state'] == 'googleAPI' )
    {
        $client->authenticate();
        $_SESSION['GGtoken'] = $client->getAccessToken();
        $redirect = 'http://' . $_SERVER['HTTP_HOST'] . $_SERVER['PHP_SELF'];
        header('Location: ' . filter_var($redirect, FILTER_SANITIZE_URL));
    }

    if (isset($_SESSION['GGtoken']))
    {
        $client->setAccessToken($_SESSION['GGtoken']);
    }

    if ($client->getAccessToken())
    {
        $user = $oauth2->userinfo->get();
        
        $email = filter_var($user['email'], FILTER_SANITIZE_EMAIL);
        $img = filter_var($user['picture'], FILTER_VALIDATE_URL);
        $name = $user['name'];
        $GGuserID = $user['id'];

        // The access token may have been updated lazily.
        $_SESSION['GGtoken'] = $client->getAccessToken();
        
        $_SESSION['GGuserInfo'] = Array(
            'id' => $GGuserID,
            'name' => $name,
            'email' => $email,
            'photo' => $img
        );
        
        $jsVar .= "googleInfo = {};\n";
        $jsVar .= "googleInfo.libel = \"<img style='margin-right:5px' align='left' src='$img?sz=50'>\";\n";
        $jsVar .= "googleInfo.libel += \"$name<br>\";\n";
        $jsVar .= "googleInfo.libel += \"$email<br><br>\";\n";
        $jsVar .= "googleInfo.user = {};\n";
        $jsVar .= "googleInfo.user.id = \"$GGuserID\";\n";
        $jsVar .= "googleInfo.user.name = \"$name\";\n";
        $jsVar .= "googleInfo.user.email = \"$email\";\n";
        $jsVar .= "googleInfo.user.photo = \"$img\";\n";
        
    } else {
        $authUrl = $client->createAuthUrl();
        $jsVar .= 'googleInfo = {};';
        $jsVar .= 'googleInfo.libel = "<a href='.$authUrl.'><img src=\"themes/img/signInWithGoogle.png\" /></a>";';
    }
    
    echo headerTemplate();
    echo cssLoadTemplate('js/ExtJs/resources/css/ext-all.css');
    echo cssLoadTemplate('themes/login-all.css');
    echo jsCallTemplate($jsVar);
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading Core API...";');
    
    // Facebook
    echo jsLoadTemplate('https://connect.facebook.net/en_US/all.js');
    
    
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
echo jsLoadTemplate('js/main-all.js');
echo footerTemplate();
?>
