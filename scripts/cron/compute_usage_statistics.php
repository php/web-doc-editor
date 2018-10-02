<?php

/***
* This script is intended to be placed in a cronjob.
* It must be run every Thursday, at 01hOO for example.
* On Unix, you can use crontab -e and place this :
* 00 01 * * 4 /path/php/binary /path/to/your/vcs/dir/doc-editor/scripts/cron/compute_usage_statistics.php
****/

require_once dirname(__FILE__) . '/../../php/Conf.php';
require_once dirname(__FILE__) . '/../../php/ProjectManager.php';
require_once dirname(__FILE__) . '/../../php/UsageStatistics.php';
require_once dirname(__FILE__) . '/../../php/DBConnection.php';
require_once dirname(__FILE__) . '/../../php/RepositoryManager.php';

$pm = ProjectManager::getInstance();
$db = DBConnection::getInstance();
$us = UsageStatistics::getInstance();
$rm = RepositoryManager::getInstance();

$availableProject = $pm->getAvailableProject();

while( list($key, $project) = each($availableProject) ) {

    // Define it as a project
    $pm->setProject($project['code']);

    // Just for the first run - We check if the usageStatistics table is empty
    $s = 'SELECT COUNT(*) as total FROM `usageStatistics`';
    $r = $db->query($s, array());
    $a = $r->fetch_object();

    if( $a->total == 0 ) {
        $us->computeAll('2010'); // Place here the Year we want to start to compute statistics (this Year was included)

        $rm->setStaticValue('info', 'computeUsageStatistics', '', true);
        exit;
    }

    // We start compute stats for yesterday's month
    $yesterday = new DateTime();
    $yesterday->sub(new DateInterval('P1D'));

    $us->computeMonth($yesterday->format('Y-m'));

    $rm->setStaticValue('info', 'computeUsageStatistics', '', true);

}

?>
