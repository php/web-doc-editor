<?php
/* 
 * 
 * 
 */

class EntitiesFetcher {

    private static $instance;
    public $entities;

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
        $this->parseEntities();
    }

    private function parseEntities()
    {
        $am = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $files = explode("|", $appConf[$project]['entities.usedbyeditor.location']);

        $count = 0;
        while( list($k, $file) = each($files))
        {
            $content = file_get_contents($file);
            preg_match_all('/<!ENTITY\s(.*?)\s(\'|")(.*?)(\2)>/s', $content, $match);

            $from = explode('/',$file);

            for( $i=0; $i < count($match[1]); $i++ ) {
                $this->entities[$count]['id']       = $count;
                $this->entities[$count]['from']     = $from[count($from)-1];
                $this->entities[$count]['entities'] = $match[1][$i];
                $this->entities[$count]['value']    = htmlentities($match[3][$i]);
                $count ++;
            }
        }

    }

    public function getEntities()
    {
        return $this->entities;
    }

}

?>
