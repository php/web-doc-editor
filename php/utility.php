<?php

require_once dirname(__FILE__) . '/AccountManager.php';

/**
 * Print debug information into a file (.debug) into data folder.
 *
 * @param $mess The debug message.
 */
function debug($mess)
{
    $am      = AccountManager::getInstance();
    $appConf = $am->appConf;
    $project = $am->project;

    $mess = '['.@date('d/m/Y H:i:s').'] by '
            .$am->vcsLogin.' : '.str_replace("\r\n", " ", $mess)."\n";

    $fp = fopen($appConf[$project]['vcs.path'].'../.debug', 'a+');
    fwrite($fp, $mess);
    fclose($fp);
}

function errlog($mess)
{
    $am      = AccountManager::getInstance();
    $appConf = $am->appConf;
    $project = $am->project;

    $mess = '['.@date('d/m/Y H:i:s').'] by '
            .$am->vcsLogin.' : '.str_replace("\r\n", " ", $mess)."\n";

    $fp = fopen($appConf[$project]['vcs.path'].'../.errlog', 'a+');
    fwrite($fp, $mess);
    fclose($fp);
}

?>
