<?php

/***
* This script is intended to be placed in a cronjob.
* It must be run every Monday, at 08hOO for example.
* On Unix, you can use crontab -e and place this :
* 00 08 * * 1 /path/php/binary /path/to/your/vcs/dir/doc-editor/scripts/cron/send_work_to_list.php
****/

require_once dirname(__FILE__) . '/../../php/Conf.php';
require_once dirname(__FILE__) . '/../../php/AccountManager.php';
require_once dirname(__FILE__) . '/../../php/LogManager.php';
require_once dirname(__FILE__) . '/../../php/ProjectManager.php';
require_once dirname(__FILE__) . '/../../php/RepositoryFetcher.php';
require_once dirname(__FILE__) . '/../../php/RepositoryManager.php';

$rf = RepositoryFetcher::getInstance();
$rm = RepositoryManager::getInstance();
$pm = ProjectManager::getInstance();
$availableProject = $pm->getAvailableProject();

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

    $existingLanguage = $rm->getExistingLanguage();

    // For all language, we check the build
    foreach ($existingLanguage as $lang) {

        echo "Is there some work to send to the ".$lang["code"]." list ?\n";

        $lang = $lang["code"];

        $data = $rf->getRawWork($lang);


        // What we must do when the build failed
        //if( $data["total"] != 0 ) {
        if( $data['PatchesForReview']['nb'] != 0 ) {


            $msg = "Hello PHP ".strtoupper($lang)." Documentation team,

There are contributions within the online editor queue for this language.
Please review, then commit or delete these patches.

";

    /*
    if( $data['workInProgress']['nb'] != 0 ) {
        $msg .= "    Work in progress : \n    -----------------------\n";

        for( $i=0; $i < count($data['workInProgress']['data']); $i++) {
            $msg .= "        * (".$data['workInProgress']['data'][$i]['type'].") On ".$data['workInProgress']['data'][$i]['date']." by ".$data['workInProgress']['data'][$i]['user']." : ".$data['workInProgress']['data'][$i]['filePath']."\n";
        }
        $msg .="\n\n";
    }
    */

    if( $data['PatchesForReview']['nb'] != 0 ) {
        $msg .= "    Patches for review : \n    -----------------------\n\n";

        for( $i=0; $i < count($data['PatchesForReview']['data']); $i++)
        {

            switch($data['PatchesForReview']['data'][$i]['type']) {
                case 'update' :
                    $libelMod = 'Modified';
                    break;
                case 'new' :
                    $libelMod = 'New file';
                    break;
                case 'delete' :
                    $libelMod = 'Deleted';
                    break;
            };

            $msg .= $libelMod.": ".$data['PatchesForReview']['data'][$i]['fileFullPath']."\n";
            $msg .= "By: ".$data['PatchesForReview']['data'][$i]['user']." on ".$data['PatchesForReview']['data'][$i]['date']."\n";

            $msg .= "===================================================================\n";

            // We get the diff
            $file = new File(
                $data['PatchesForReview']['data'][$i]['fileLang'],
                $data['PatchesForReview']['data'][$i]['filePath'].$data['PatchesForReview']['data'][$i]['fileName']
                );
            $r = $file->diff();
            $msg .= implode("\n", $r);

            $msg .= "\n
            => Put this change into your patches : https://edit.php.net/?project=php&action=putIntoMyPatches&idDB=".$data['PatchesForReview']['data'][$i]['idDB']."
            => Delete this change: https://edit.php.net/?project=php&action=deleteThisChange&idDB=".$data['PatchesForReview']['data'][$i]['idDB']."
            ";

            $msg .="\n";
            $msg .= "                                          ------------------------------------------------------------------\n\n";
        }
        $msg .="\n\n";

    }



    $msg .= "
--
https://edit.php.net/
This email is send automatically by the Php Docbook Online Editor.
    ";

            //Usefull for language like pt_BR for example, because doc-pt_br don't exist, it's doc-pt-br
            $emailLang = str_replace("_", "-", strtolower($lang));

            $to = ( $lang === 'en' ) ? "phpdoc@lists.php.net" : "doc-$emailLang@lists.php.net";

            $subject = "Contributions are ready for review";

            // We send an email for this failed build
            AccountManager::getInstance()->email($to, $subject, $msg, $to, 'list');

            echo "email send !\n";

            }
    }
}
?>
