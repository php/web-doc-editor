<?php

/***
* This script is intended to be placed in a cronjob.
* It must be run every day, at 00hOO for example.
* On Unix, you can use crontab -e and place this :
* 00 00 * * * /path/php/binary /path/to/your/vcs/dir/doc-editor/scripts/cron/update_data.php
****/

require_once dirname(__FILE__) . '/../../php/Conf.php';
require_once dirname(__FILE__) . '/../../php/ProjectManager.php';
require_once dirname(__FILE__) . '/../../php/RepositoryManager.php';
require_once dirname(__FILE__) . '/../../php/TranslationStatistic.php';
require_once dirname(__FILE__) . '/../../php/TranslatorStatistic.php';
require_once dirname(__FILE__) . '/../../php/utility.php';

$isCLI = (PHP_SAPI == 'cli');

if (!$isCLI) {
    echo "\nOnly in CLI mode !\n\n";
    exit;
}

$rm = RepositoryManager::getInstance();
$pm = ProjectManager::getInstance();

$availableProject = $pm->getAvailableProject();

while( list($key, $project) = each($availableProject) ) {

    // We must delete this var to be re-generated
    unset($rm->existingLanguage);

    // Define it as a project
    $pm->setProject($project['code']);

    /*
     * Lock
     *
     */
    $lock = new LockFile('project_' . strtoupper($project['code']) . '_lock_update_data');

    if( $lock->lock() )
    {
        // Write into the lock the update position
        $lock->writeIntoLock('vcs_update');

        // VCS update
        $rm->updateRepository();

        // Write into the lock the update position
        $lock->writeIntoLock('cleanUp_DB');

        // Clean Up DB
        $rm->cleanUp();

        // Write into the lock the update position
        $lock->writeIntoLock('revcheck');

        // Start RevCheck
        $rm->applyRevCheck();

        // Write into the lock the update position
        $lock->writeIntoLock('checkErrors');

        // Start checkErrors
        $rm->applyOnlyTools();

        // Write into the lock the update position
        $lock->writeIntoLock('notInEN');

        // Search for NotInEN Old Files
        $rm->updateNotInEN();

        // Write into the lock the update position
        $lock->writeIntoLock('updateTranslatorInfo');

        // Parse translators
        $rm->updateTranslatorInfo();

        // Write into the lock the update position
        $lock->writeIntoLock('ComputeAllStatistics');

        // Compute all summary
        TranslationStatistic::getInstance()->computeSummary('all');
        TranslatorStatistic::getInstance()->computeSummary('all');

        if( $project['code'] == 'php' ) {

            // Write into the lock the update position
            $lock->writeIntoLock('StaticRevcheck');

            $rm->applyStaticRevcheck();
        }

        // Store this update info
        $info = array();
        $info['user']   = 'root';

        $rm->setStaticValue('info', 'updateData', json_encode($info), true);

        $lock->release();

    } else {
        echo 'Update in progress, can\'t do this action until the first finish'.PHP_EOL;
        continue;
    }


}


?>
