<?php

require_once dirname(__FILE__) . '/../../php/Conf.php';
require_once dirname(__FILE__) . '/../../php/ProjectManager.php';
require_once dirname(__FILE__) . '/../../php/RepositoryManager.php';
require_once dirname(__FILE__) . '/../../php/TranslationStatistic.php';
require_once dirname(__FILE__) . '/../../php/TranslatorStatistic.php';
require_once dirname(__FILE__) . '/../../php/utility.php';

error_reporting(E_ALL);
set_time_limit(0);

if (PHP_SAPI != 'cli') {
    echo "Sorry, but this console must be use only in CLI mode";
    exit;
}

$rm = RepositoryManager::getInstance();
$pm = ProjectManager::getInstance();
$availableProject = $pm->getAvailableProject();
$conn = DBConnection::getInstance();

function menu()
{
    global $menu;
    fwrite(STDOUT, $menu);
    $choice = fgets(STDIN);

    switch($choice) {
        case 1: goUpdateCVS();
            break;
        case 2: goRevCheck();
            break;
        case 3: goErrorTools();
            break;
    };
}


function goUpdateCVS() {
    global $availableProject, $rm, $pm;

    reset($availableProject);

    echo "Start Update CVS repository....\n";

    while( list($key, $project) = each($availableProject) )
    {
        $pm->setProject($project['code']);

        echo "for project -".$project['code']."-\n";

        unset($rm->existingLanguage);
        $pm->setProject($project['code']);
        $startTime = new DateTime();
        $startTimeStamp = $startTime->getTimestamp();
        $rm->updateRepository();
        $endTime = new DateTime();
        $endTimeStamp = $endTime->getTimestamp();

    } // while

    echo "done ! ( ".time2string($endTimeStamp-$startTimeStamp)." )\n";
    menu();
}

function goRevCheck() {
    global $availableProject, $rm, $pm, $conn;

    reset($availableProject);

    echo "Start Apply Revcheck....\n";

    while( list($key, $project) = each($availableProject) )
    {
        $pm->setProject($project['code']);

        // We cleanUp the database for this project
        $conn->query("DELETE FROM `files` WHERE `project`='%s'", array($project['code']));
        $conn->query("OPTIMIZE TABLE `files` ", array());

        echo "for project -".$project['code']."-\n";

        $startTime = new DateTime();
        $startTimeStamp = $startTime->getTimestamp();

        $rm->applyRevCheck();

        $endTime = new DateTime();
        $endTimeStamp = $endTime->getTimestamp();

    } // while

    echo "done ! ( ".time2string($endTimeStamp-$startTimeStamp)." )\n";
    menu();
}

function goErrorTools() {
    global $availableProject, $rm, $pm;

    reset($availableProject);

    echo "Start Error Tools....\n";

    while( list($key, $project) = each($availableProject) )
    {
        $pm->setProject($project['code']);

        echo "for project -".$project['code']."-\n";

        $startTime = new DateTime();
        $startTimeStamp = $startTime->getTimestamp();

        $rm->applyOnlyTools();

        $endTime = new DateTime();
        $endTimeStamp = $endTime->getTimestamp();

    } // while

    echo "done ! ( ".time2string($endTimeStamp-$startTimeStamp)." )\n";
    menu();
}


$home_message = "
=================================
| Welcome to the PhDOE console. |
=================================

";

$menu = "
1 - Update CVS repository
2 - Apply revcheck tools
3 - Apply Error tools
4 - ...

Enter your choice :
";



fwrite(STDOUT, $home_message);

menu();




//fwrite(STDOUT, "Bye\n\n");       // Output - Some text
exit(0);


?>
