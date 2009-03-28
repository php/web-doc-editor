<?php
error_reporting(E_ALL);

include "./php/class.php";

$phpDoc = new phpDoc();

$FilePath=$_GET['FilePath'];
$FileName=$_GET['FileName'];

$patch = $phpDoc->getRawDiff($FilePath, $FileName);

$file='patch-'.time().'.patch';

$size=strlen($patch);

header("Content-Type: application/force-download; name=\"$file\"");
header("Content-Transfer-Encoding: binary");
header("Content-Length: $size");
header("Content-Disposition: attachment; filename=\"$file\"");
header("Expires: 0");
header("Cache-Control: no-cache, must-revalidate");
header("Pragma: no-cache");
echo $patch;
exit(); 


?>