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
    function getOpenBugs()
    {
        $appConf = AccountManager::getInstance()->appConf;
        $project = AccountManager::getInstance()->project;

        if( $this->lang == 'en' ) {
            $url = $appConf[$project]['bugs.url.en'];
        } else {
            $url = $appConf[$project]['bugs.url.lang'];
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

                $match = array();

                // Try to find the link to this documentation bug
                preg_match('/From manual page: (.*?)(#|\s)/s', $description, $match);

                $result[$i]['xmlID'] = ( isset($match[1]) ) ? $match[1] : false;

                // We remove all caracters except xmlid (after and before)
                if( $result[$i]['xmlID'] ) {
                    $match = array();
                    preg_match('/function\.(.[^%]*)/es', $result[$i]['xmlID'], $match);
                    if( isset($match[1]) ) {
                        $result[$i]['xmlID'] = $match[1];
                    }
                }


                $i++;
            }
        }
        return $result;

    }

}
