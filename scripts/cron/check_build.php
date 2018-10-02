<?php

/***
* This script is intended to be placed in a cronjob.
* It must be run every Thursday, at 01hOO for example.
* On Unix, you can use crontab -e and place this :
* 00 01 * * 4 /path/php/binary /path/to/your/vcs/dir/doc-editor/scripts/cron/check_build.php
****/

require_once dirname(__FILE__) . '/../../php/Conf.php';
require_once dirname(__FILE__) . '/../../php/AccountManager.php';
require_once dirname(__FILE__) . '/../../php/LogManager.php';
require_once dirname(__FILE__) . '/../../php/ProjectManager.php';
require_once dirname(__FILE__) . '/../../php/RepositoryManager.php';

$rm = RepositoryManager::getInstance();
$pm = ProjectManager::getInstance();
$availableProject = $pm->getAvailableProject();


// Don't build for this lang code: ar,bg,cs,nl,el,he,pt,sl,sv
$dontBuild = array("ar","bg","cs","nl","no","el","he","pt","sl","sv");

while( list($key, $project) = each($availableProject) ) {

    // Actually, only PHP project support to be automatically checked for the build. Skip all others projects
    if( $project['code'] != "php" ) {
        continue;
    }

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

        if( in_array($lang["code"], $dontBuild) ) {
            echo "Exclude build for this language\n";
            continue;
        }

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
        This email is send automatically by the Php Docbook Online Editor.
        ";

                //Usefull for language like pt_BR for example, because doc-pt_br don't exist, it's doc-pt-br
                $emailLang = str_replace("_", "-", strtolower($lang));

                $to = ( $lang === 'en' ) ? "phpdoc@lists.php.net" : "doc-$emailLang@lists.php.net";

                $subject = "[DOC-".strtoupper($emailLang)."] - Your documentation is broken";

                // We send an email for this failed build
                // AccountManager::getInstance()->email($to, $subject, $msg, $to, 'list');

                // echo "email send !\n";

                // We store it into DB
                LogManager::getInstance()->saveFailedBuild($lang, $return["logContent"]);

            }
        }
        // Remove the lock File
        $lock->release();
    }
}
?>
