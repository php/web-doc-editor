<?php

require_once dirname(__FILE__) . '/AccountManager.php';

/**
 * Print debug information into a file (.debug) into data folder.
 *
 * @param $mess The debug message.
 */
function debug($mess)
{
    $appConf = AccountManager::getInstance()->appConf;
    $project = AccountManager::getInstance()->project;

    $mess = '['.@date('d/m/Y H:i:s').'] by '
            .AccountManager::getInstance()->vcsLogin.' : '.str_replace("\r\n", " ", $mess)."\n";

    $fp = fopen($appConf[$project]['vcs.path'].'../.debug', 'a+');
    fwrite($fp, $mess);
    fclose($fp);
}

?>