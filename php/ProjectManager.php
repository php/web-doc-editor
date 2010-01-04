<?php


require_once dirname(__FILE__) . '/AccountManager.php';

class ProjectManager
{
    private static $instance;

    public static function getInstance()
    {
        if (!isset(self::$instance)) {
            $c = __CLASS__;
            self::$instance = new $c;
        }
        return self::$instance;
    }

    public $project;

    public $availableProject = array(
         0 => Array('code' => 'php',  'iconCls' => 'project-php',  'name' => 'Php Documentation'),
         1 => Array('code' => 'pear', 'iconCls' => 'project-pear', 'name' => 'Pear Documentation')
    );


    private function __construct()
    {

    }

    public function getAvailableProject()
    {
        return $this->availableProject;
    }

    public function isDefinedProject($project)
    {
        $isDefined = false;

        for( $i=0; $i < count($this->availableProject); $i++ ) {
            if( $this->availableProject[$i]['code'] == $project ) {
                $isDefined = true;
            }
        }

        return $isDefined;

    }

    public function setProject($project)
    {
        // This project must be defined in $availableProject constant
        if( ! $this->isDefinedProject($project) ) {
            return false;
        }

        // This project must have a conf file
        if( is_file(dirname(__FILE__) . '/conf.'. $project .'.inc.php') ) {

            include_once dirname(__FILE__) . '/conf.inc.php';
            include_once dirname(__FILE__) . '/conf.'. $project .'.inc.php';

            $this->project = $project;
            AccountManager::getInstance()->project = $project;
            $_SESSION['project'] = $project;

            return true;
        } else {
            return false;
        }
    }
}
?>