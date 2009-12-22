<?php

/**
 * A class for read bugs form http://bugs.php.net
 *
 */
class BugReader {
    
    /**
     * The lang
     *
     * @var string
     */
    private $lang;
    
    /**
     * Initialise
     *
     * @param string $lang
     */
    function __construct($lang)
    {
        $this->lang   = $lang;
    }
    
    /**
     * Get all open bugs for this LANG.
     * 
     * @return An indexed array (id, title, description, link, pubDate) readable by ExtJs
     */
    function getOpenBugs() {

        if( $this->lang == 'en' ) {
            $url = 'http://bugs.php.net/rss/search.php?cmd=display&bug_type[]=Documentation+problem&status=Open&search_for=&php_os=&php_os_not=0&boolean=1&author_email=&bug_age=0&by=&order_by=id&direction=DESC&phpver=&limit=10&assign=';
        } else {
            $url = 'http://bugs.php.net/rss/search.php?cmd=display&bug_type[]=Translation+problem&status=Open&search_for=&php_os=&php_os_not=0&boolean=1&author_email=&bug_age=0&by=&order_by=id&direction=DESC&phpver=&limit=All&assign=&format=rss';
        }

        $r = @file_get_contents($url);

        if( !$r ) { return false; }

        $xml = new SimpleXMLElement($r);
        $channel = $xml;

        $i=0;
        $result = array();
        foreach ($channel->item as $item) {
            $title = (string) $item->title;
            $description = $item->description;

            if (strstr($title, '['.strtoupper($this->lang).']') || $this->lang == 'en') {

                $result[$i]['id'] = $i;
                $result[$i]['title'] = $title;

                $match = array();
                if (strstr($description, "Reproduce code:")) {
                    preg_match_all('/Description:\s*?------------(.*?)Reproduce code:/s', $description, $match);
                } else {
                    preg_match_all('/Description:\s*?------------(.*)/s', $description, $match);
                }

                $result[$i]['description'] = (isset($match[1][0])) ? highlight_string(trim($match[1][0]), true) : '';
                $result[$i]['link'] = (string) $item->link;
                $i++;
            }
        }
        return $result;

    }
    
}