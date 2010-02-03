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

$rm = RepositoryManager::getInstance();
$pm = ProjectManager::getInstance();

$availableProject = $pm->getAvailableProject();

while( list($key, $project) = each($availableProject) ) {

    // We must delete this var to be re-generated
    unset($rm->existingLanguage);

    // Define it as a project
    $pm->setProject($project['code']);

    // VCS update
    //$rm->updateRepository();

    // After update the repo, we need to chmod all file to be able to save it again as www server user & group
    $cmd = "cd ".$DOC_EDITOR_VCS_PATH."; chmod -R 777 ./; chown -R  ".$DOC_EDITOR_WWW_USER.":".$DOC_EDITOR_WWW_GROUP." ./";

    exec($cmd);

    // Clean Up DB
    $rm->cleanUp();

    // Set the lock File
    $lock = new LockFile('project_' . $project['code'] . '_lock_apply_tools');

    if ($lock->lock()) {

        // Start Revcheck
echo "apply revcheck\n";
        $rm->applyRevCheck();

        // Search for NotInEN Old Files
echo "apply notInEN\n";
        $rm->updateNotInEN();

        // Parse translators
echo "apply TranslatorInfo\n";
        $rm->updateTranslatorInfo();

        // Compute all summary
echo "apply translation computeSummary\n";
        TranslationStatistic::getInstance()->computeSummary('all');
echo "apply translator computeSummary\n";
        TranslatorStatistic::getInstance()->computeSummary('all');    

        // Set lastUpdate date/time
        $rm->setLastUpdate('data');
    }
    $lock->release();

}



?>
