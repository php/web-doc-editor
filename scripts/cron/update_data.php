<?php

/***
* This script is intended to be placed in a cronjob.
* It must be run every day, at 00hOO for example.
* On Unix, you can use crontab -e and place this :
* 00 00 * * * /path/php/binary /path/to/your/vcs/dir/doc-editor/scripts/cron/update_data.php
****/

require_once dirname(__FILE__) . '/../../php/Conf.php';
require_once dirname(__FILE__) . '/../../php/ProjectManager.php';
require_once dirname(__FILE__) . '/../../php/RepositoryManager.php';
require_once dirname(__FILE__) . '/../../php/TranslationStatistic.php';
require_once dirname(__FILE__) . '/../../php/TranslatorStatistic.php';
require_once dirname(__FILE__) . '/../../php/utility.php';

$isCLI = (PHP_SAPI == 'cli');

if ($isCLI) {
    echo "\nPHP Documentation Online Editor - Update data\n\n";
}

$rm = RepositoryManager::getInstance();
$pm = ProjectManager::getInstance();

$availableProject = $pm->getAvailableProject();

while( list($key, $project) = each($availableProject) ) {

    // We must delete this var to be re-generated
    unset($rm->existingLanguage);

    // Define it as a project
    $pm->setProject($project['code']);

    /*
     * VCS update
     * 
     */
    
    if ($isCLI) {
        echo "\n * Update the VCS repository for the " . $project['name'] . "...";
    }
    flush();
    
    $startTime = new DateTime();
    $startTimeStamp = $startTime->getTimestamp();
    
    $rm->updateRepository();
    
    $endTime = new DateTime();
    $endTimeStamp = $endTime->getTimestamp();
    
    if ($isCLI) {
        echo "done ! ( ".time2string($endTimeStamp-$startTimeStamp)." )";
    }
    flush();
    
    /*
     * Clean Up DB
     * 
     */

    if ($isCLI) {
        echo "\n * Clean up the database...";
    }
    flush();
    
    $startTime = new DateTime();
    $startTimeStamp = $startTime->getTimestamp();
    
    $rm->cleanUp();
    
    $endTime = new DateTime();
    $endTimeStamp = $endTime->getTimestamp();

    if ($isCLI) {
        echo "done ! ( ".time2string($endTimeStamp-$startTimeStamp)." )";
    }
    flush();
    
    // Set the lock File
    $lock = new LockFile('project_' . $project['code'] . '_lock_apply_tools');

    if ($lock->lock()) {

        /*
         * Start applaying tools
         * 
         */
        if ($isCLI) {
            echo "\n * Applying tools on repository...";
        }
        flush();
    
        $startTime = new DateTime();
        $startTimeStamp = $startTime->getTimestamp();
        
        $rm->applyRevCheck();

        // Search for NotInEN Old Files
        $rm->updateNotInEN();
    
        $endTime = new DateTime();
        $endTimeStamp = $endTime->getTimestamp();

        if ($isCLI) {
            echo "done ! ( ".time2string($endTimeStamp-$startTimeStamp)." )";
        }
        flush();
        
        /*
         * Parse translators
         * 
         */

        if ($isCLI) {
            echo "\n * Parsing translation data...";
        }
        flush();
    
        $startTime = new DateTime();
        $startTimeStamp = $startTime->getTimestamp();
        
        $rm->updateTranslatorInfo();

        $endTime = new DateTime();
        $endTimeStamp = $endTime->getTimestamp();

        if ($isCLI) {
            echo "done ! ( ".time2string($endTimeStamp-$startTimeStamp)." )";
        }
        flush();
        
        
        /*
         * Compute all statistics
         * 
         */
        
        if ($isCLI) {
            echo "\n * Compute all statistics...";
        }
        flush();
    
        $startTime = new DateTime();
        $startTimeStamp = $startTime->getTimestamp();
        
        // Compute all summary
        TranslationStatistic::getInstance()->computeSummary('all');
        TranslatorStatistic::getInstance()->computeSummary('all');    

        $endTime = new DateTime();
        $endTimeStamp = $endTime->getTimestamp();

        if ($isCLI) {
            echo "done ! ( ".time2string($endTimeStamp-$startTimeStamp)." )";
        }
        flush();
        
        
        /*
         * We start the revcheck's script to make a static page into data/revcheck/ directory
         * Only for php project
         * 
         */
        
        if( $project['code'] == 'php' ) {
            
            if ($isCLI) {
                echo "\n * Make a static page for the revcheck...";
            }
            flush();
        
            $startTime = new DateTime();
            $startTimeStamp = $startTime->getTimestamp();
        
            $rm->applyStaticRevcheck();
            
            $endTime = new DateTime();
            $endTimeStamp = $endTime->getTimestamp();

            if ($isCLI) {
                echo "done ! ( ".time2string($endTimeStamp-$startTimeStamp)." )";
            }
            flush();
        }

        // Store this info
        $info = array();
        $info['user']   = 'root';

        $rm->setStaticValue('info', 'updateData', json_encode($info), true);
    }
    $lock->release();

}

if ($isCLI) {
    echo "\n\nUpdate completed!\n";
}

?>
