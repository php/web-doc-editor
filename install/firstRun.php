<?php
error_reporting(E_ALL);
set_time_limit(0);

require_once '../php/class.php';
require_once '../php/html.templates.php';

$isCLI = (PHP_SAPI == 'cli');

if ($isCLI) {
    echo "PHP Documentation Online Editor - Installation\n\n";
} else {
    echo headerTemplate('Installation', 1);
}

$phpDoc = new phpDoc();

// We checkOut phpdoc-all as cvsread

if ($isCLI) {
    echo "\n * Initial repository checkout...";
} else {
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initial repository checkout...";');
}
flush();
$phpDoc->checkoutRepository();

if ($isCLI) {
    echo "\n * Applying tools on repository...";
} else {
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Applying tools on repository...";');
}
flush();
//We apply all tools for all language
$phpDoc->rev_start();

if ($isCLI) {
    echo "\n * Parsing translation data...";
} else {
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Parsing translation data...";');
}
flush();

// Parse translators
$phpDoc->rev_parse_translation();

// We update the last update date/time into DB
$phpDoc->set_last_update();


if ($isCLI) {
    echo "\n\nInstallation completed!\n";
} else {
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Installation completed !";');
    echo footerTemplate();
}

