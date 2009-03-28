<?php
session_start();

error_reporting(E_ALL);
set_time_limit(0);

include "./php/class.php";

$fileID = isset($_GET['fileID']) ? $_GET['fileID'] : '';
if ($fileID == '') { 
    exit; 
}

$lang = isset($_GET['lang']) ? $_GET['lang'] : '';


$phpDoc = new phpDoc();

$phpDoc->login('cvsread', 'phpfi', $lang);

$result = $phpDoc->searchXmlID($lang, $fileID);

$_SESSION['directAccess'] = $result;

header("Location: ./");
exit;
