<?php

require_once dirname(__FILE__) . '/AccountManager.php';

/**
 * Print debug information into a file (.debug) into data folder.
 *
 * @param $mess The debug message.
 */
function debug($mess)
{
    $mess = '['.date('d/m/Y H:i:s').'] by '
            .AccountManager::getInstance()->vcsLogin.' : '.$mess."\n";

    $fp = fopen($GLOBALS['DOC_EDITOR_VCS_PATH'].'../.debug', 'a+');
    fwrite($fp, $mess);
    fclose($fp);
}

?>
