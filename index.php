<?php
session_start();

// Log the user in if needed
if (!isset($_SESSION['userID'])) {
    echo headerTemplate();
    echo cssLoadTemplate('js/extjs/resources/css/ext-all.css');
    echo cssLoadTemplate('themes/style.css');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading Core API...";');
    echo jsLoadTemplate('js/extjs/adapter/ext/ext-base.js');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading UI Components...";');
    echo jsLoadTemplate('js/extjs/ext-all.js');
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initializing...";');
    echo jsLoadTemplate('js/login.js');
    echo footerTemplate();
    exit;
}

echo headerTemplate();
echo cssLoadTemplate('js/extjs/resources/css/ext-all.css');
echo cssLoadTemplate('js/extjs/resources/css/xtheme-default.css', 'appTheme');
// Ext.ux Css files
echo cssLoadTemplate('js/ux/GridSummary/Ext.ux.grid.GridSummary.css');
echo cssLoadTemplate('js/ux/CheckTreePanel/Ext.ux.tree.CheckTreePanel.css');
echo cssLoadTemplate('themes/style.css');
// ExtJs Javascript core files
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading Core API...";');
echo jsLoadTemplate('js/extjs/adapter/ext/ext-base.js');
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Loading UI Components...";');
echo jsLoadTemplate('js/extjs/ext-all.js');
// Ext.ux Javascript files
echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initializing...";');
echo jsLoadTemplate('js/ux/GridSummary/Ext.ux.grid.GridSummary.js');
echo jsLoadTemplate('js/ux/miframe1_2/miframe.js');
echo jsLoadTemplate('js/ux/md5/md5.js');
echo jsLoadTemplate('js/ux/codemirror/js/codemirror.js');
echo jsLoadTemplate('js/ux/Ext.ux.CodeMirror.js');
echo jsLoadTemplate('js/ux/CheckTreePanel/Ext.ux.tree.CheckTreePanel.js');
echo jsLoadTemplate('js/main_override.js');
echo jsLoadTemplate('js/main.js');

if (isset($_SESSION['directAccess']) && is_object($_SESSION['directAccess'])) {
    $directAccess = 'var directAccess = {"lang":"'.$_SESSION['directAccess']->lang.'", "path":"'.$_SESSION['directAccess']->path.'", "name":"'.$_SESSION['directAccess']->name.'"}';
    $_SESSION['directAccess'] = '';
} else {
    $directAccess = 'var directAccess = false;';
}
echo jsCallTemplate($directAccess);

echo footerTemplate();

/**
 * Gets the tool header template
 *
 * @param string $title The HTML page title. Default to the tool name
 * @return string
 */
function headerTemplate($title = 'PHP Documentation Online Editor')
{
    return <<<EOD
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
 <head>
  <title>$title</title>
  <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  <meta name="description" content="" />
  <link type="text/css" rel="stylesheet" href="themes/loading.css" />
 </head>
 <body>
  <div id="loading-mask" style=""></div>
  <div id="loading">
   <div class="loading-indicator">
    <img src="themes/img/php.png" class="loading-php-logo" alt="PHP" />PhpDocumentation Online Editor<br/>
    <span id="loading-msg">Loading styles and images...</span>
   </div>
  </div>

EOD;
}

/**
 * Returns a javascript inline call
 *
 * @param string $script The javascript code
 * @return string The script element
 */
function jsCallTemplate($script)
{
    return sprintf('  <script type="text/javascript">%s</script>', $script) . "\n";
}

/**
 * Returns a javascript script loading element
 *
 * @param string $src The script url
 * @return string The script element
 */
function jsLoadTemplate($src)
{
    return sprintf('  <script type="text/javascript" src="%s"></script>', $src) . "\n";
}


/**
 * Returns a stylesheet loading element
 *
 * @param string $href The stylesheet url
 * @param string $id An optional id for the HTML element
 * @return string The link element
 */
function cssLoadTemplate($href, $id = '')
{
    if ($id) {
        $id = 'id="' . $id . '" ';
    }
    return sprintf('  <link type="text/css" rel="stylesheet" href="%s" %s/>', $href, $id) . "\n";
}

/**
 * Returns the tool footer template
 *
 * @return string
 */
function footerTemplate()
{
    return <<<EOD
 </body>
</html>
EOD;
}
