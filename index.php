<?php

session_start();

require_once './php/html.templates.php';

// Log the user in if needed
if (!isset($_SESSION['userID'])) {
    echo headerTemplate();
    echo cssLoadTemplate('js/extjs/resources/css/ext-all.css');
    echo cssLoadTemplate('themes/style_min.css');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading Core API...";');
    echo jsLoadTemplate('js/extjs/adapter/ext/ext-base.js');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading UI Components...";');
    echo jsLoadTemplate('js/extjs/ext-all.js');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initializing...";');
    echo jsLoadTemplate('js/util.js'); // TODO: REMOVE AFTER USING YUI-COMPRESSOR
    echo jsLoadTemplate('js/login_override.js');
    echo jsLoadTemplate('js/ux/Ext.ux.WindowDrawer.js');
    echo jsLoadTemplate('js/login.js');
    echo footerTemplate();
    exit;
}

echo headerTemplate();
echo cssLoadTemplate('js/extjs/resources/css/ext-all.css', 'extTheme');
echo cssLoadTemplate('themes/empty.css', 'appTheme');
echo cssLoadTemplate('themes/style_min.css');

// Ext.ux Css files
echo cssLoadTemplate('js/ux/GridSummary/Ext.ux.grid.GridSummary.css');
echo cssLoadTemplate('themes/ux_extjsPowered_all.css'); // All css files of folder js/ux/extjsPowered/, minimized

// ExtJs Javascript core files
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading Core API...";');
echo jsLoadTemplate('js/extjs/adapter/ext/ext-base.js');
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading UI Components...";');
echo jsLoadTemplate('js/extjs/ext-all.js');

// Ext.ux Javascript files
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initializing...";');
echo jsLoadTemplate('js/ux/GridSummary/Ext.ux.grid.GridSummary.js');
echo jsLoadTemplate('js/ux/Notification/Ext.ux.Notification.js');

echo jsLoadTemplate('js/ux_extjsPowered_all.js'); // All Js files of folder js/ux/extjsPowered/, minimized

echo jsLoadTemplate('js/ux/md5/md5.js');
echo jsLoadTemplate('js/ux/codemirror/js/codemirror.js');
echo jsLoadTemplate('js/ux/Ext.ux.CodeMirror.js');
// Main app
echo jsLoadi18nTemplate();
echo jsLoadTemplate('js/main_override.js');
//~ echo jsLoadTemplate('js/main.js');
echo jsLoadTemplate('js/main_min.js');

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
