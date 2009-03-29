<?php
session_start();

if (!isset($_SESSION['userID'])) {
    header("Location: ./login.php");
    exit;
}

?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html>
 <head>
  <title>Php Documentation Online Editor</title>
  <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
  <meta name="description" content="" />
  <style type="text/css">
#loading-mask{
    position:absolute;
    left:0;
    top:0;
    width:100%;
    height:100%;
    z-index:20000;
    background-color:white;
}
#loading {
    position:absolute;
    left:45%;
    top:40%;
    padding:2px;
    z-index:20001;
    height:auto;
    border: 1px solid #000;
}

#loading .loading-indicator{
    background:white;
    color:#444;
    font:bold 13px tahoma,arial,helvetica;
    padding:10px;
    margin:0;
    height:auto;
}
#loading-msg {
    font: normal 10px arial,tahoma,sans-serif;
}
  </style>
 </head>
 <body>
  <div id="loading-mask" style=""></div>
  <div id="loading">
   <div class="loading-indicator">
    <img src="img/php.png" width="95" height="51" style="margin-right:8px;float:left;vertical-align:top;"/>PhpDocumentation Online Editor<br />
    <span id="loading-msg">Loading styles and images...</span>
   </div>
  </div>
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
  <script type="text/javascript">
<?php

if (isset($_SESSION['directAccess']) && is_object($_SESSION['directAccess'])) {
     echo 'var directAccess = {"lang":"'.$_SESSION['directAccess']->lang.'", "path":"'.$_SESSION['directAccess']->path.'", "name":"'.$_SESSION['directAccess']->name.'"}';
     $_SESSION['directAccess'] = '';
} else {
     echo 'var directAccess = false;';
}
?></script>
 </body>
</html>
