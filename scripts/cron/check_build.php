<?php

/***
* This script is intended to be placed in a cronjob.
* It must be run every Thursday, at 01hOO for example.
* On Unix, you can use crontab -e and place this :
* 00 01 * * 4 /usr/bin/php /path/to/your/vcs/dir/doc-editor/scripts/cron/check_build.php
****/

require_once dirname(__FILE__) . '/../../php/conf.inc.php';
require_once dirname(__FILE__) . '/../../php/AccountManager.php';
require_once dirname(__FILE__) . '/../../php/LogManager.php';
require_once dirname(__FILE__) . '/../../php/ProjectManager.php';
require_once dirname(__FILE__) . '/../../php/RepositoryManager.php';

$rm = RepositoryManager::getInstance();
$pm = ProjectManager::getInstance();
$availableProject = $pm->getAvailableProject();

while( list($key, $project) = each($availableProject) ) {

echo "enter into ".$project['code']."\n";

    // We must delete this var to be re-generated
    unset($rm->existingLanguage);

    // Define it as a project
    $pm->setProject($project['code']);

    // We cleanUp the DB before this process
    $rm->cleanUpBeforeCheckBuild();

    $existingLanguage = $rm->getExistingLanguage();

    // For all language, we check the build
    foreach ($existingLanguage as $lang) {

        echo "check lang : ".$lang["code"]."\n";

        $lang = $lang["code"];

        $lock = new LockFile('project_'.$pm->project.'_lock_check_build_'.$lang);
        if ($lock->lock()) {


            $return = $rm->checkBuild($lang);

            // What we must do when the build failed
            if( $return["state"] == "ko" ) {

                $msg = "Your documentation is broken. The build is done on Friday.

        Please, try to fix it *quickly*.

        Here is the output of the configure.php script :

        =============================

        ".implode("\n", $return["logContent"])."

        --
        This email is send automatically by the PhpDocumentation Online Editor.
        ";

                $to = "doc-$lang@lists.php.net";

                $subject = "[DOC-".strtoupper($lang)."] - Your documentation is broken";

                // We send an email for this failed build
                AccountManager::getInstance()->email($to, $subject, $msg, 'www');

                // We store it into DB
                LogManager::getInstance()->saveFailedBuild($lang, $return["logContent"]);

            }
        }
        // Remove the lock File
        $lock->release();
    }
}
?>
