<?php
session_start();

if (!isset($_SESSION['userID'])) {
    echo headerTemplate();
?>
  <link type="text/css" rel="stylesheet" href="extjs/resources/css/ext-all.css" />
  <link type="text/css" rel="stylesheet" href="themes/style.css" />
  <!-- ExtJs Javascript core files -->
  <script type="text/javascript">document.getElementById('loading-msg').innerHTML = 'Loading Core API...';</script>
  <script type="text/javascript" src="extjs/adapter/ext/ext-base.js"></script>
  <script type="text/javascript">document.getElementById('loading-msg').innerHTML = 'Loading UI Components...';</script>
  <script type="text/javascript" src="extjs/ext-all.js"></script>
  <script type="text/javascript">document.getElementById('loading-msg').innerHTML = 'Initializing...';</script>
  <script type="text/javascript" src="js/login.js"></script>
<?php
    echo footerTemplate();
    exit;
}

echo headerTemplate();

?>
  <link type="text/css" rel="stylesheet" href="extjs/resources/css/ext-all.css" />
  <link type="text/css" rel="stylesheet" href="extjs/resources/css/xtheme-default.css" id="appTheme" />

  <!-- Ext.ux Css files -->
  <link type="text/css" rel="stylesheet" href="js/ux/GridSummary/Ext.ux.grid.GridSummary.css" />
  <link type="text/css" rel="stylesheet" href="js/ux/CheckTreePanel/Ext.ux.tree.CheckTreePanel.css" />
  <link type="text/css" rel="stylesheet" href="themes/style.css" />

  <!-- ExtJs Javascript core files -->
  <script type="text/javascript">document.getElementById('loading-msg').innerHTML = 'Loading Core API...';</script>
  <script type="text/javascript" src="extjs/adapter/ext/ext-base.js"></script>

  <script type="text/javascript">document.getElementById('loading-msg').innerHTML = 'Loading UI Components...';</script>
  <script type="text/javascript" src="extjs/ext-all.js"></script>

  <!-- Ext.ux Javascript files -->
  <script type="text/javascript">document.getElementById('loading-msg').innerHTML = 'Initializing...';</script>
  <script type="text/javascript" src="js/ux/GridSummary/Ext.ux.grid.GridSummary.js"></script>

  <script type="text/javascript" src="js/ux/miframe1_2/miframe.js"></script>
  <script type="text/javascript" src="js/ux/md5/md5.js"></script>

  <script type="text/javascript" src="js/ux/codemirror/js/codemirror.js"></script>
  <script type="text/javascript" src="js/ux/Ext.ux.CodeMirror.js"></script>

  <script type="text/javascript" src="js/ux/md5/md5.js"></script>
  <script type="text/javascript" src="js/ux/CheckTreePanel/Ext.ux.tree.CheckTreePanel.js"></script>

  <script type="text/javascript" src="js/main_override.js"></script>
  <script type="text/javascript" src="js/main.js"></script>

  <!-- Principal -->
<?php

echo '  <script type="text/javascript">' . "\n";
if (isset($_SESSION['directAccess']) && is_object($_SESSION['directAccess'])) {
    echo 'var directAccess = {"lang":"'.$_SESSION['directAccess']->lang.'", "path":"'.$_SESSION['directAccess']->path.'", "name":"'.$_SESSION['directAccess']->name.'"}';
    $_SESSION['directAccess'] = '';
} else {
    echo 'var directAccess = false;';
}
echo '  </script>' . "\n";

echo footerTemplate();

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
    <img src="img/php.png" width="95" height="51" style="margin-right:8px;float:left;vertical-align:top;"/>PhpDocumentation Online Editor<br />
    <span id="loading-msg">Loading styles and images...</span>
   </div>
  </div>
EOD;
}

function footerTemplate()
{
    return <<<EOD
 </body>
</html>
EOD;
}