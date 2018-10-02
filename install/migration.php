<?php
error_reporting(E_ALL);
set_time_limit(0);

require_once '../php/ProjectManager.php';
require_once '../php/DBConnection.php';
require_once '../php/RepositoryManager.php';
require_once '../php/AccountManager.php';

$am = AccountManager::getInstance();
$rm = RepositoryManager::getInstance();
$pm = ProjectManager::getInstance();
$conn = DBConnection::getInstance();
$availableProject = $pm->getAvailableProject();

while( list($key, $project) = each($availableProject) ) {

    // Only for php project
    if( $project['code'] != 'php' ) continue;

    // We must delete this var to be re-generated
    unset($rm->existingLanguage);

    // Define it as a project
    $pm->setProject($project['code']);
    $appConf = $am->appConf;
    $project = $am->project;

    // Get all modified files

        $s = 'SELECT
                *
             FROM
                `work`
             WHERE
                `project` = "%s"';

        $params = array($project);

        $r = $conn->query($s, $params);

        $infos = array();

        while ($a = $r->fetch_assoc()) {

            $destFolder = $appConf['GLOBAL_CONFIGURATION']['data.path'].$appConf[$project]['vcs.module'].'-new/'.$a['lang'].$a['path'];
            $fromFolder = $appConf['GLOBAL_CONFIGURATION']['data.path'].$appConf[$project]['vcs.module'].'/'.$a['lang'].$a['path'];

            echo 'Dest folder : '.$destFolder."\r\n";
            echo 'From folder : '.$fromFolder."\r\n";

            // Ensure the dest folder exist
            mkdir($destFolder, 0777, true);

            // If this entrie is a file, we move it into the dest folder
            if( $a['name'] != '-' && is_file($fromFolder.$a['name'].'.new') ) {
                rename( $fromFolder.$a['name'].'.new', $destFolder.$a['name'] );
            }

        }


}

?>
