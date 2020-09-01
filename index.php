<?php

session_start();

require_once dirname(__FILE__) . '/php/html.templates.php';
require_once dirname(__FILE__) . '/php/Conf.php';
require_once dirname(__FILE__) . '/php/oauth.php';
require_once dirname(__FILE__) . '/php/utility.php';

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
            $jsVar = "\n".'var directAccess = {"link":"perm", "lang":"'.$r->lang.'", "path":"'.$r->path.'", "name":"'.$r->name.'", "project":"'.$_project.'"},';
        } else {
            $jsVar = "\n".'var directAccess = false,';
        }
    } else {
        $jsVar = "\n".'var directAccess = false,';
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

    $jsVar = "\n".'var directAccess = {"link":"patch", "lang":"en", "path":"'.htmlspecialchars($filePath).'", "name":"'.htmlspecialchars($fileName).'", "project":"'.htmlspecialchars($_project).'"},';

} else if (isset($_REQUEST['patchID'])) {

    $patchID = trim($_REQUEST['patchID'], '/ ');
    $_project = $_REQUEST['project'];

    require_once dirname(__FILE__) . '/php/ProjectManager.php';
    require_once dirname(__FILE__) . '/php/RepositoryManager.php';

    // Set the project
    ProjectManager::getInstance()->setProject($_project);

    $patchInfo = RepositoryManager::getInstance()->getPatchInfo($patchID);

    $jsVar = "\n".'var directAccess = {"link":"patchID", "lang":"en", "patchID":"'.htmlspecialchars($patchID).'", "patchName":"'.htmlspecialchars($patchInfo->name).'", "project":"'.htmlspecialchars($_project).'"},';

} else if (isset($_REQUEST['action'])) {

    $_project = $_REQUEST['project'];
    $_action = $_REQUEST['action'];
    $_idDB = $_REQUEST['idDB'];

    require_once dirname(__FILE__) . '/php/ProjectManager.php';

    // Set the project
    ProjectManager::getInstance()->setProject($_project);

    $jsVar = "\n".'var directAccess = {
        "project":"'.htmlspecialchars($_project).'",
        "action": "'.htmlspecialchars($_action).'",
        "idDB": "'.htmlspecialchars($_idDB).'"
    },';

} else {
    $jsVar = "\nvar directAccess = false,";
}

// Init auth var
if( isset($_COOKIE['loginApp']) ) {
    $jsVar .= " loginApp = \"".html_entity_decode($_COOKIE['loginApp'])."\",";
} else {
    $jsVar .= " loginApp = false,";
}

$jsVar .= " auth = {};\n";


// Log the user in if needed
if (!isset($_SESSION['userID']))
{
    $Conf = Config::getInstance()->getConf();

    // Init var
    if( !isset($_SESSION['oauth']) )  $_SESSION['oauth'] = array();

    /* instagram */
    if( isset($_GET['oauth']) && $_GET['oauth'] == 'instagram') {

        $_SESSION['oauth']['identService'] = 'instagram';

        $instagram = new Oauth_instagram($Conf['GLOBAL_CONFIGURATION']['oauth.instagram.clientID'], $Conf['GLOBAL_CONFIGURATION']['oauth.instagram.clientSecret']);
        $instagram->redirect_uri = $Conf['GLOBAL_CONFIGURATION']['oauth.redirectURL'];

        $instagram->RequestCode();
    }

    if( isset($_SESSION['oauth']['identService']) && $_SESSION['oauth']['identService'] == 'instagram' && isset($_GET['code']) ) {

        $instagram = new Oauth_instagram($Conf['GLOBAL_CONFIGURATION']['oauth.instagram.clientID'], $Conf['GLOBAL_CONFIGURATION']['oauth.instagram.clientSecret']);
        $instagram->redirect_uri = $Conf['GLOBAL_CONFIGURATION']['oauth.redirectURL'];
        $access_token = $instagram->RequestToken($_GET['code']);
        $user = $instagram->getUserInfo($access_token->access_token);

        $jsVar .= "
            auth.service   = \"".$_SESSION['oauth']['identService']."\",
            auth.serviceID = \"".htmlspecialchars($user->id)."\",
            auth.login     = \"".htmlspecialchars($user->username)."\",
            auth.email     = \"\";
        ";

    }

    /* Github */
    if( isset($_GET['oauth']) && $_GET['oauth'] == 'github') {

        $_SESSION['oauth']['identService'] = 'github';

        $git = new Oauth_github($Conf['GLOBAL_CONFIGURATION']['oauth.github.clientID'], $Conf['GLOBAL_CONFIGURATION']['oauth.github.clientSecret']);
        $git->redirect_uri = $Conf['GLOBAL_CONFIGURATION']['oauth.redirectURL'];

        $git->RequestCode();
    }

    if( isset($_SESSION['oauth']['identService']) && $_SESSION['oauth']['identService'] == 'github' && isset($_GET['code']) ) {

        $git = new Oauth_github($Conf['GLOBAL_CONFIGURATION']['oauth.github.clientID'], $Conf['GLOBAL_CONFIGURATION']['oauth.github.clientSecret']);
        $git->redirect_uri = $Conf['GLOBAL_CONFIGURATION']['oauth.redirectURL'];
        $access_token = $git->RequestToken($_GET['code']);
        $user = $git->getUserInfo($access_token);

        $jsVar .= "
            auth.service   = \"".$_SESSION['oauth']['identService']."\",
            auth.serviceID = \"".htmlspecialchars($user->id)."\",
            auth.login     = \"".htmlspecialchars($user->name)."\",
            auth.email     = \"".htmlspecialchars($user->email)."\";

        ";

    }


    /* stackoverflow */
    if( isset($_GET['oauth']) && $_GET['oauth'] == 'stackoverflow') {

        $_SESSION['oauth']['identService'] = 'stackoverflow';

        $stack = new Oauth_stackoverflow($Conf['GLOBAL_CONFIGURATION']['oauth.stackoverflow.clientID'], $Conf['GLOBAL_CONFIGURATION']['oauth.stackoverflow.clientSecret'], $Conf['GLOBAL_CONFIGURATION']['oauth.stackoverflow.clientKey']);
        $stack->redirect_uri = $Conf['GLOBAL_CONFIGURATION']['oauth.redirectURL'];

        $stack->RequestCode();
    }

    if( isset($_SESSION['oauth']['identService']) && $_SESSION['oauth']['identService'] == 'stackoverflow' && isset($_GET['code']) ) {

        $stack = new Oauth_stackoverflow($Conf['GLOBAL_CONFIGURATION']['oauth.stackoverflow.clientID'], $Conf['GLOBAL_CONFIGURATION']['oauth.stackoverflow.clientSecret'], $Conf['GLOBAL_CONFIGURATION']['oauth.stackoverflow.clientKey']);
        $stack->redirect_uri = $Conf['GLOBAL_CONFIGURATION']['oauth.redirectURL'];
        $access_token = $stack->RequestToken($_GET['code']);

        $user = $stack->getUserInfo($access_token);

        $jsVar .= "

            auth.service   = \"".$_SESSION['oauth']['identService']."\",
            auth.serviceID = \"".htmlspecialchars($user->items[0]->user_id)."\",
            auth.login     = \"".htmlspecialchars(utf8_encode(html_entity_decode($user->items[0]->display_name)))."\",
            auth.email     = \"\";

        ";

    }

    /* facebook */
    if( isset($_GET['oauth']) && $_GET['oauth'] == 'facebook') {

        $_SESSION['oauth']['identService'] = 'facebook';

        $facebook = new Oauth_facebook($Conf['GLOBAL_CONFIGURATION']['oauth.facebook.clientID'], $Conf['GLOBAL_CONFIGURATION']['oauth.facebook.clientSecret']);
        $facebook->redirect_uri = $Conf['GLOBAL_CONFIGURATION']['oauth.redirectURL'];

        $facebook->RequestCode();
    }

    if( isset($_SESSION['oauth']['identService']) && $_SESSION['oauth']['identService'] == 'facebook' && isset($_GET['code']) ) {

        $facebook = new Oauth_facebook($Conf['GLOBAL_CONFIGURATION']['oauth.facebook.clientID'], $Conf['GLOBAL_CONFIGURATION']['oauth.facebook.clientSecret']);
        $facebook->redirect_uri = $Conf['GLOBAL_CONFIGURATION']['oauth.redirectURL'];
        $access_token = $facebook->RequestToken($_GET['code']);

        $user = $facebook->getUserInfo($access_token);

        $jsVar .= "

            auth.service   = \"".$_SESSION['oauth']['identService']."\",
            auth.serviceID = \"".htmlspecialchars($user->id)."\",
            auth.login     = \"".htmlspecialchars($user->name)."\",
            auth.email     = \"".htmlspecialchars($user->email)."\";

        ";

    }


    /* google */
    if( isset($_GET['oauth']) && $_GET['oauth'] == 'google') {

        $_SESSION['oauth']['identService'] = 'google';

        $google = new Oauth_google($Conf['GLOBAL_CONFIGURATION']['oauth.google.clientID'], $Conf['GLOBAL_CONFIGURATION']['oauth.google.clientSecret']);
        $google->redirect_uri = $Conf['GLOBAL_CONFIGURATION']['oauth.redirectURL'];

        $google->RequestCode();
    }

    if( isset($_SESSION['oauth']['identService']) && $_SESSION['oauth']['identService'] == 'google' && isset($_GET['code']) ) {

        $google = new Oauth_google($Conf['GLOBAL_CONFIGURATION']['oauth.google.clientID'], $Conf['GLOBAL_CONFIGURATION']['oauth.google.clientSecret']);
        $google->redirect_uri = $Conf['GLOBAL_CONFIGURATION']['oauth.redirectURL'];
        $access_token = $google->RequestToken($_GET['code']);

        $user = $google->getUserInfo($access_token);

        $displayName = (trim($user->displayName) == "") ? $user->email : $user->displayName;

        $jsVar .= "

            auth.service   = \"" . $_SESSION['oauth']['identService'] . "\",
            auth.serviceID = \"" . htmlspecialchars($user->id) . "\",
            auth.login     = \"" . htmlspecialchars($displayName) . "\",
            auth.email     = \"" . htmlspecialchars($user->email) . "\";

        ";

    }


    /* linkedin */
    if( isset($_GET['oauth']) && $_GET['oauth'] == 'linkedin') {

        $_SESSION['oauth']['identService'] = 'linkedin';

        $linkedin = new Oauth_linkedin($Conf['GLOBAL_CONFIGURATION']['oauth.linkedin.clientID'], $Conf['GLOBAL_CONFIGURATION']['oauth.linkedin.clientSecret']);
        $linkedin->redirect_uri = $Conf['GLOBAL_CONFIGURATION']['oauth.redirectURL'];

        $linkedin->RequestCode();
    }

    if( isset($_SESSION['oauth']['identService']) && $_SESSION['oauth']['identService'] == 'linkedin' && isset($_GET['code']) ) {

        $linkedin = new Oauth_linkedin($Conf['GLOBAL_CONFIGURATION']['oauth.linkedin.clientID'], $Conf['GLOBAL_CONFIGURATION']['oauth.linkedin.clientSecret']);
        $linkedin->redirect_uri = $Conf['GLOBAL_CONFIGURATION']['oauth.redirectURL'];
        $access_token = $linkedin->RequestToken($_GET['code']);

        $user = $linkedin->getUserInfo($access_token);

        $jsVar .= "

            auth.service   = \"".$_SESSION['oauth']['identService']."\",
            auth.serviceID = \"".htmlspecialchars($user['id'])."\",
            auth.login     = \"".htmlspecialchars($user['name'])."\",
            auth.email     = \"\";

        ";

    }

    /* twitter */
    if( isset($_GET['oauth']) && $_GET['oauth'] == 'twitter') {

        require_once dirname(__FILE__) . '/php/oauth/twitter/twitteroauth.php';

        $_SESSION['oauth']['identService'] = 'twitter';

        $connection = new TwitterOAuth($Conf['GLOBAL_CONFIGURATION']['oauth.twitter.clientID'], $Conf['GLOBAL_CONFIGURATION']['oauth.twitter.clientSecret']);

        $temporary_credentials = $connection->getRequestToken($Conf['GLOBAL_CONFIGURATION']['oauth.redirectURL']);
        $redirect_url = $connection->getAuthorizeURL($temporary_credentials);

        header('Location: ' . $redirect_url);
        exit;

    }

    if( isset($_SESSION['oauth']['identService']) && $_SESSION['oauth']['identService'] == 'twitter' && isset($_GET['oauth_token']) ) {
        require_once dirname(__FILE__) . '/php/oauth/twitter/twitteroauth.php';


        $connection = new TwitterOAuth($Conf['GLOBAL_CONFIGURATION']['oauth.twitter.clientID'], $Conf['GLOBAL_CONFIGURATION']['oauth.twitter.clientSecret'], $_GET['oauth_token'],$_GET['oauth_verifier']);

        $token_credentials = $connection->getAccessToken($_GET['oauth_verifier']);
        $account = $connection->get('account/verify_credentials');

        $jsVar .= "

            auth.service   = \"".$_SESSION['oauth']['identService']."\",
            auth.serviceID = \"".htmlspecialchars($account->id_str)."\",
            auth.login     = \"".htmlspecialchars($account->name)."\",
            auth.email     = \"\";

        ";
    }

    echo headerTemplate();
    echo cssLoadTemplate('js/ExtJs/resources/css/ext-all.css');
    echo cssLoadTemplate('themes/login-all.css');
    echo jsCallTemplate($jsVar);
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading Core API...";');

    echo jsLoadTemplate('js/ExtJs/adapter/ext/ext-base.js');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading UI Components...";');
    echo jsLoadTemplate('js/ExtJs/ext-all.js');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initializing...";');
    echo jsLoadTemplate('js/login-all.js');
    echo footerTemplate('loginPage');
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

//echo jsCallTemplate('window.___gcfg = { lang: \'en_US\', size: \'medium\', annotation: \'bubble\', width: 40};');

//echo jsLoadTemplate('https://apis.google.com/js/plusone.js');

// Ext.ux Javascript files
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initializing...";');
echo jsLoadi18nTemplate();
echo jsLoadTemplate('js/main-all.js');
echo footerTemplate();
?>
