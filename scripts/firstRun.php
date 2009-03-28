<?php
error_reporting(E_ALL);
set_time_limit(0);

include "../php/class.php";

$phpDoc = new phpDoc();

// We checkOut phpdoc-all as cvsread
echo "=> checkout repository\n";
flush();
$phpDoc->checkoutRepository();

echo "=> Apply tools\n";
flush();
//We apply all tools for all language
$phpDoc->rev_start();

echo "=> Parse translator\n";
flush();
// Parse translators
$phpDoc->rev_parse_translation();

?>