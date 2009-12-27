<?php

/***
* This script is intended to be placed in a cronjob.
* It must be run every Thursday, at 01hOO for example.
* On Unix, you can use crontab -e and place this :
* 00 01 * * 4 /usr/bin/php /path/to/your/vcs/dir/doc-editor/scripts/cron/check_entities.php
****/

require_once dirname(__FILE__) . '/../../php/conf.inc.php';
require_once dirname(__FILE__) . '/../../php/LockFile.php';
require_once dirname(__FILE__) . '/../../php/ToolsCheckEntities.php';

$lock = new LockFile('lock_check_entities');

if ($lock->lock()) {

    ToolsCheckEntities::getInstance()->startCheck();

}
// Remove the lock File
$lock->release();;

?>