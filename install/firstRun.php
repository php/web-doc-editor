<?php
error_reporting(E_ALL);
set_time_limit(0);

require_once '../php/html.templates.php';
require_once '../php/ProjectManager.php';
require_once '../php/RepositoryManager.php';
require_once '../php/TranslationStatistic.php';
require_once '../php/TranslatorStatistic.php';

$isCLI = (PHP_SAPI == 'cli');

if ($isCLI) {
    echo "PHP Documentation Online Editor - Installation\n\n";
} else {
    echo headerTemplate('Installation', 1);
}

$rm = RepositoryManager::getInstance();
$pm = ProjectManager::getInstance();

$availableProject = $pm->getAvailableProject();

while( list($key, $project) = each($availableProject) ) {

    // We must delete this var to be re-generated
    unset($rm->existingLanguage);

    // Define it as a project
    $pm->setProject($project['code']);

    if ($isCLI) {
        echo "\n * Initial repository checkout for the " . $project['name'] . "...";
    } else {
        echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Initial repository checkout for the ' . $project['name'] . '...";');
    }
    flush();
    // checkout repository from VCS
    $rm->checkoutRepository();

    if ($isCLI) {
        echo "\n * Applying tools on repository...";
    } else {
        echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Applying tools on repository...";');
    }
    flush();
    //We apply all tools for all language
    $rm->applyRevCheck();

    // Search for NotInEN old Files
    $rm->updateNotInEN();

    if ($isCLI) {
        echo "\n * Parsing translation data...";
    } else {
        echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Parsing translation data...";');
    }
    flush();

    // Parse translators
    $rm->updateTranslatorInfo();


    if ($isCLI) {
        echo "\n * Compute all statistics...";
    } else {
        echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Compute all statistics...";');
    }
    flush();

    // Compute all summary
    TranslationStatistic::getInstance()->computeSummary('all');
    TranslatorStatistic::getInstance()->computeSummary('all');

    // We update the last update date/time into DB
    $rm->setLastUpdate();


}



if ($isCLI) {
    echo "\n\nInstallation completed!\n";
} else {
    echo jsCallTemplate('document.getElementById("loading-msg").innerHTML = "Installation completed !";');
    echo footerTemplate();
}

