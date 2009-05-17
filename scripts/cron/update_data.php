<?php

/***
* This script is intended to be placed in a cronjob.
* It must be run every day, at 00hOO for example.
* On Unix, you can use crontab -e and place this :
* 00 00 * * * /usr/bin/php /path/to/your/cvs/dir/doc-editor/scripts/cron/update_data.php
****/


require_once dirname(__FILE__) . '/../../php/class.php';

$phpDoc = new phpDoc();

// Cvs update
$phpDoc->updateRepository();

// After update the repo, we need to chmod all file to be able to save it again as www server user
$cmd = "cd ".DOC_EDITOR_CVS_PATH."; chmod -R 777 ./; chown -R  ".DOC_EDITOR_WWW_USER.":".DOC_EDITOR_WWW_GROUP." ./";
exec($cmd);

// Clean Up DB
$phpDoc->cleanUp();

// Set the lock File
$lock = new LockFile('lock_apply_tools');

if ($lock->lock()) {

  // Start Revcheck
  $phpDoc->revDoRevCheck();

  // Search for Old Files
  $phpDoc->checkOldFiles();

  // Parse translators
  $phpDoc->revParseTranslation();

  // Set lastUpdate date/time
  $phpDoc->setLastUpdate();

}
$lock->release();

?>