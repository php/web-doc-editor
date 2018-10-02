<?php

/***
* This script is intended to be placed in a cronjob.
* It must be run every Thursday, at 01hOO for example.
* On Unix, you can use crontab -e and place this :
* 00 01 * * 4 /path/php/binary /path/to/your/vcs/dir/doc-editor/scripts/cron/check_entities.php
****/

require_once dirname(__FILE__) . '/../../php/Conf.php';
require_once dirname(__FILE__) . '/../../php/LockFile.php';
require_once dirname(__FILE__) . '/../../php/ProjectManager.php';
require_once dirname(__FILE__) . '/../../php/RepositoryManager.php';
require_once dirname(__FILE__) . '/../../php/ToolsCheckEntities.php';

$rm = RepositoryManager::getInstance();
$pm = ProjectManager::getInstance();
$availableProject = $pm->getAvailableProject();

while( list($key, $project) = each($availableProject) ) {

    if( $project['code'] != "php" ) {
        continue;
    }

    // Define it as a project
    $pm->setProject($project['code']);

    $lock = new LockFile('project_' . $project['code'] . '_lock_check_entities');

    if ($lock->lock()) {

        ToolsCheckEntities::getInstance()->startCheck();

        // Set lastUpdate date/time
        $info = array();
        $info['user']   = 'root';

        $rm->setStaticValue('info', 'checkEntities', json_encode($info), true);
    }
    // Remove the lock File
    $lock->release();
}

?>
