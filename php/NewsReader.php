<?php

/**
 * A class for read News form http://news.php.net
 *
 */
class NewsReader
{

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
     * Get all news for this LANG.
     *
     * @return An indexed array (id, title, description, link, pubDate) readable by ExtJs, or false if an error occurs
     */
    function getLastNews()
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $result = array();

        if( $this->lang == 'en' ) {
            $url = $appConf[$project]['news.url.en'];
        } else {
            $url = str_replace("{LANG}", strtolower(str_replace('_', '-', $this->lang)), $appConf[$project]['news.url.lang']);
        }

        $content = @file_get_contents($url);

        if( !$content ) { return false; }

        $xml = new SimpleXMLElement($content);

        $channel = $xml->channel;

        $i = 0;
        foreach ($channel->item as $item) {
            $result[$i]['id'] = $i;
            $result[$i]['title'] = (string) $item->title;
            $result[$i]['description'] = preg_replace('/(<a href[^>]+">)([^>]+)(<\/a>)/', "$2", (string) $item->description);
            $result[$i]['link'] = (string) $item->link;
            
            // If the link isn't with https, convert it
            if( substr($result[$i]['link'], 0, 7) === 'http://' ) $result[$i]['link'] = substr_replace($result[$i]['link'], 'https://', 0, 7);
            
            
            
            $result[$i]['pubDate'] = @date('Y/m/d H:i:s', @strtotime((string) $item->pubDate));
            $i++;
        }
        return $result;

    }

}
?>
