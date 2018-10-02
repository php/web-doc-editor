<?php
/*
 *
 *
 */

class EntitiesAcronymsFetcher {

    private static $instance;
    public $acronyms;
    public $entities;

    /**
     * @static
     * @return EntitiesAcronymsFetcher
     */
    public static function getInstance()
    {
        if (!isset(self::$instance)) {
            $c = __CLASS__;
            self::$instance = new $c;
        }
        return self::$instance;
    }

    public function __construct()
    {
        $this->parseAcronyms();
        $this->parseEntities();
    }

    private function parseAcronyms()
    {
        $am = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $files = explode("|", $appConf[$project]['acronym.usedbyeditor.location']);

        $this->acronyms = array();

        $count = 0;
        while( list($k, $file) = each($files))
        {
            if( empty($file) || !$content = file_get_contents($file) ) {
                continue;
            }

            preg_match_all('/<varlistentry>(.*?)<term>(.*?)<\/term>(.*?)<simpara>(.*?)<\/simpara>(.*?)<\/varlistentry>/s', $content, $match);

            $from = explode('/',$file);

            for( $i=0; $i < count($match[2]); $i++ ) {
                if( trim($match[2][$i]) != "" ) {
                    $this->acronyms[$count]['id']       = $count;
                    $this->acronyms[$count]['from']     = $from[count($from)-1];
                    $this->acronyms[$count]['items']    = $match[2][$i];
                    $this->acronyms[$count]['value']    = htmlentities($match[4][$i]);
                    $count ++;
                }
            }
        }

    }

    private function parseEntities()
    {
        $am = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $files = explode("|", $appConf[$project]['entities.usedbyeditor.location']);

        $this->entities = array();

        $count = 0;
        while( list($k, $file) = each($files))
        {
            if( empty($file) || !$content = file_get_contents($file) ) {
                continue;
            }

            preg_match_all('/<!ENTITY\s(.*?)\s(\'|")(.*?)(\2)>/s', $content, $match);

            $from = explode('/',$file);

            for( $i=0; $i < count($match[1]); $i++ ) {
                $this->entities[$count]['id']       = $count;
                $this->entities[$count]['from']     = $from[count($from)-1];
                $this->entities[$count]['items']    = $match[1][$i];
                $this->entities[$count]['value']    = htmlentities($match[3][$i]);
                $count ++;
            }
        }

    }

    public function getEntities()
    {
        return $this->entities;
    }

    public function getAcronyms()
    {
        return $this->acronyms;
    }

}

?>
