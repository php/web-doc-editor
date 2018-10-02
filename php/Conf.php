<?php

class Config
{
    private static $instance;

    public $conf = array();

    /**
     * @static
     * @return Config
     */
    public static function getInstance()
    {
        if (!isset(self::$instance)) {
            $c = __CLASS__;
            self::$instance = new $c;
        }
        return self::$instance;
    }


    private function __construct()
    {
        $this->buildConf();
    }

    public function buildConf()
    {
        $p = dirname(__FILE__).'/conf/';

        // First, we load the global configuration file
        $this->conf['GLOBAL_CONFIGURATION'] = parse_ini_file($p."conf.ini");

        // Second, we try to load localConfiguration file
        // This file must have this name : localConf.ini
        if( is_file($p."localConf.ini") ) {
            $this->conf['GLOBAL_CONFIGURATION'] = array_merge( $this->conf['GLOBAL_CONFIGURATION'], parse_ini_file($p."localConf.ini") );
        }

        // We fix the data path here
        $this->conf['GLOBAL_CONFIGURATION']['data.path'] = realpath(dirname(__FILE__).'/../'.$this->conf['GLOBAL_CONFIGURATION']['data.path']).'/';

        // Second, we load all config project file
        $d = dir($p);
        while (false !== ($entry = $d->read())) {
            if( is_file($p.$entry) && ( $entry != 'conf.ini' && $entry != 'localConf.ini' ) ) {

               // Get the name of the project directly into the filename
               $t = explode(".", $entry);

               // First, we load the configuration file for this project
               $this->conf[strtoupper($t[1])] = parse_ini_file($p.$entry);

               // Second, we try to load a local configuration file for this project
               // This file must have this name, for example, PHP project : local.project.php.ini
               if( is_file($p.'local.'.$entry) ) {
                    $this->conf[strtoupper($t[1])] = array_merge( $this->conf[strtoupper($t[1])], parse_ini_file($p.'local.'.$entry) );
                }

            }
        }
        $d->close();

        // Third, we find all marks to be replace by a var from global_configuration array or current project
        while( list($project, $value) = each($this->conf) ) {

            if( $project == "GLOBAL_CONFIGURATION" ) { continue; }

            while( list($keys, $v ) = each($value) ) {

                $match = false;

                if( preg_match_all("/\{(.[^}]*?)\['(.*?)'\]\}/", $v,$match) ) {

                    $new_val = $v;
                    for( $i=0; $i < count($match[0]); $i++ ) {

                        $new_val = str_replace(  $match[0][$i],
                                                 $this->conf[$match[1][$i]][$match[2][$i]],
                                                 $new_val
                        );

                        $this->conf[$project][$keys]= $new_val;
                    }
                }
            }
        }

        reset($this->conf);
        return $this->conf;

    }

    public function getConf() {
        return $this->conf;
    }


}

?>
