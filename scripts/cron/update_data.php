<?php

/***
* This script is intended to be placed in a cronjob.
* It must be run every day, at 00hOO for example.
* On Unix, you can use crontab -e and place this :
* 00 00 * * * /usr/bin/php /path/to/your/vcs/dir/doc-editor/scripts/cron/update_data.php
****/

require_once dirname(__FILE__) . '/../../php/conf.inc.php';
require_once dirname(__FILE__) . '/../../php/ProjectManager.php';
require_once dirname(__FILE__) . '/../../php/RepositoryManager.php';
require_once dirname(__FILE__) . '/../../php/TranslationStatistic.php';
require_once dirname(__FILE__) . '/../../php/TranslatorStatistic.php';

$isCLI = (PHP_SAPI == 'cli');

if ($isCLI) {
    echo "\nPHP Documentation Online Editor - Update data\n\n";
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
        echo "\n * Update the repository checkout for the " . $project['name'] . "...";
    }
    flush();
    // VCS update
    //$rm->updateRepository();

    if ($isCLI) {
        echo "\n * Clean up the database...";
    }
    flush();
    // Clean Up DB
    $rm->cleanUp();

    // Set the lock File
    $lock = new LockFile('project_' . $project['code'] . '_lock_apply_tools');

    if ($lock->lock()) {

        if ($isCLI) {
            echo "\n * Applying tools on repository...";
        }
        flush();
        // Start Revcheck
        $rm->applyRevCheck();

        // Search for NotInEN Old Files
        $rm->updateNotInEN();

        if ($isCLI) {
            echo "\n * Parsing translation data...";
        }
        flush();
        // Parse translators
        $rm->updateTranslatorInfo();

        if ($isCLI) {
            echo "\n * Compute all statistics...";
        }
        flush();
        // Compute all summary
        TranslationStatistic::getInstance()->computeSummary('all');
        TranslatorStatistic::getInstance()->computeSummary('all');    

        // Set lastUpdate date/time
        $rm->setLastUpdate('data');
    }
    $lock->release();

}

if ($isCLI) {
    echo "\n\nUpdate completed!\n";
}

?>
