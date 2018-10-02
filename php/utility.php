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

    $debugURI = ( isset($appConf[$project]) ) ? $appConf[$project]['vcs.path'].'../.debug' : $appConf['GLOBAL_CONFIGURATION']['data.path'].'/.debug';

    $fp = fopen($debugURI, 'a+');
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

    // Send me all error for debug warning
    $am->email(
        'yannick.torres@gmail.com',
        '[PhDOE - Error] New error detected',
        "A new error was detected :\n\n====".$mess."\n\n====",
        'yannick@php.net',
        'others'
        );

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

function DiffGenHTMLOutput($content) {

    $return = '<table class="code">';
    $classes = array(
        '+' => 'ins',
        '-' => 'del',
        ' ' => '',
        '@' => 'line'
    );
    $header = true;
    foreach ($content as $string) {
        if ($string=='') $string = ' '; // temp fix for empty string
        if ($string[0] == '@' && !$header) $return .= '<tr><td class="truncated">&nbsp;</td></tr>';
        if ($header && $string[0] == '@') {
            $header = false; //headers ended
        } elseif (!$header && !in_array($string[0], array('+','-',' ','@'))) { // Index: path/to/file or diff -uN bla bla or other headers
            $return .= '<tr><td class="truncated">&nbsp;</td></tr>';
            $header = true; //headers of new file started
        }

        $return .= '<tr>
                        <td class="'.($header ? 'header' : $classes[$string[0]]).'">
                            '.str_replace(' ', '&nbsp;', htmlentities($string, ENT_QUOTES, 'UTF-8')).'
                        </td>
                    </tr>';


    }
    $return .= '<tr><td class="truncated">&nbsp;</td></tr>';
    $return .= '<table>';

    return $return;
}

function time2string($timeline) {
    $periods = array('hour' => 3600, 'minute' => 60, 'second' => 1);

    $ret = '';

    foreach($periods AS $name => $seconds){
        $num = floor($timeline / $seconds);
        $timeline -= ($num * $seconds);
        $ret .= $num.' '.$name.(($num > 1) ? 's' : '').' ';
    }

    return trim($ret);
}


function getFlickr() {

    $return = array();

    $flickrRSS = 'https://api.flickr.com/services/feeds/groups_pool.gne?id=610963@N20&format=rss_200';

    $xml = simplexml_load_file($flickrRSS);

    foreach ($xml->channel->item as $item ) {

        $namespaces = $item->getNameSpaces(true);
        $t = $item->children($namespaces['media'])->thumbnail->attributes();
        $thumbnail = $t['url'];

        $return[] = array(
        'img' => (string)$thumbnail,
        'link' => (string)$item->link
        );

    }

    return $return;
}

?>
