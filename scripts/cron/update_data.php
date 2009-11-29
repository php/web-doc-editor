<?php

/***
* This script is intended to be placed in a cronjob.
* It must be run every day, at 00hOO for example.
* On Unix, you can use crontab -e and place this :
* 00 00 * * * /usr/bin/php /path/to/your/vcs/dir/doc-editor/scripts/cron/update_data.php
****/

require_once dirname(__FILE__) . '/../../php/conf.inc.php';
require_once dirname(__FILE__) . '/../../php/RepositoryManager.php';

$rm = RepositoryManager::getInstance();

// VCS update
$rm->updateRepository();

// After update the repo, we need to chmod all file to be able to save it again as www server user & group
$cmd = "cd ".DOC_EDITOR_VCS_PATH."; chmod -R 777 ./; chown -R  ".DOC_EDITOR_WWW_USER.":".DOC_EDITOR_WWW_GROUP." ./";
exec($cmd);

// Clean Up DB
$rm->cleanUp();

// Set the lock File
$lock = new LockFile('lock_apply_tools');

if ($lock->lock()) {

    // Start Revcheck
    $rm->applyRevCheck();

    // Search for NotInEN Old Files
    $rm->updateNotInEN();

    // Parse translators
    $rm->updateTranslatorInfo();

    // Set lastUpdate date/time
    $rm->setLastUpdate();
}
$lock->release();

?>
