<?php


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

function elapsedTime($startDate, $endDate) {

    $return = array();

    $units = Array(
        'year(s)'   => 12 *4*7*24*60*60,
        'month(s)'  => 4    *7*24*60*60,
        'week(s)'   => 7      *24*60*60,
        'day(s)'    =>         24*60*60,
        'hour(s)'   =>            60*60,
        'minute(s)' =>               60,
        'second(s)' =>                1
    );

    $startDate = strtotime($startDate);
    $endDate = strtotime($endDate);

    $seconds = floor(($endDate - $startDate));

    if( $seconds < 1 ) {
        return '';
    }

    while( list($k, $v) = each($units) ) {

        if( ($seconds / $v) >= 1 || $k == 'seconds' ) {
            $secondsConverted = floor($seconds / $v);
            return Array('units' => $k,
                         'value' => $secondsConverted);
        }

    }
}
?>
