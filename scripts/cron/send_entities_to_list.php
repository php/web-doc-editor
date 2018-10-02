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
require_once dirname(__FILE__) . '/../../php/ToolsCheckEntities.php';


$pm = ProjectManager::getInstance();
$availableProject = $pm->getAvailableProject();

while( list($key, $project) = each($availableProject) ) {

    // Actually, only PHP project support to be automatically checked for the build. Skip all others projects
    if( $project['code'] != "php" ) {
        continue;
    }

    echo "enter into ".$project['code']."\n";

    // Define it as a project
    $pm->setProject($project['code']);

    $ToolsCheckEntities = new ToolsCheckEntities();
    $r = $ToolsCheckEntities->getData();

    // We kip only UNKNOW_HOST & HTTP_NOT_FOUND

    $result['UNKNOWN_HOST'] = array();
    $result['HTTP_NOT_FOUND'] = array();

    for( $i=0; $i < count($r['node']); $i++ ) {

        if( $r['node'][$i]['result'] == 'UNKNOWN_HOST' ) {
            $result['UNKNOWN_HOST'][] = $r['node'][$i];
        }

        if( $r['node'][$i]['result'] == 'HTTP_NOT_FOUND' ) {
            $result['HTTP_NOT_FOUND'][] = $r['node'][$i];
        }
    }

    echo "Is there some entities to send to the list ?\n";

    if( count($result['UNKNOWN_HOST']) > 0 || count($result['HTTP_NOT_FOUND']) > 0 ) {

        $msg = "Hello PHP Documentation team,

Below is a list of URL entities that are experiencing fatal errors:

";
        if( count($result['UNKNOWN_HOST']) > 0 ) {

            $msg .= "UNKNOWN_HOST\n";

            for( $i=0; $i < count($result['UNKNOWN_HOST']); $i++ ) {
                $msg .= '- &'.$result['UNKNOWN_HOST'][$i]['entities'].'; : '.$result['UNKNOWN_HOST'][$i]['url']."\n";
            }

            $msg .="\n\n";
        }

        if( count($result['HTTP_NOT_FOUND']) > 0 ) {

            $msg .= "HTTP_NOT_FOUND\n";

            for( $i=0; $i < count($result['HTTP_NOT_FOUND']); $i++ ) {
                $msg .= '- &'.$result['HTTP_NOT_FOUND'][$i]['entities'].'; : '.$result['HTTP_NOT_FOUND'][$i]['url']."\n";
            }

            $msg .="\n\n";
        }

        $msg .= "
--
https://edit.php.net/
This email was generated on ".@date('M, n, Y', strtotime($r['node'][0]['date']))." and sent automatically
by the PHP DocBook Online Editor
";
        $to = "phpdoc@lists.php.net";

        $subject = "Broken URL entities report";

        // We send an email for this failed build
        AccountManager::getInstance()->email($to, $subject, $msg, $to, 'list');

        echo "email send !\n";
    }

}
?>
