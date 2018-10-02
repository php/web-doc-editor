<?php


require_once dirname(__FILE__) . '/AccountManager.php';

class ProjectManager
{
    private static $instance;

    /**
     * @static
     * @return ProjectManager
     */
    public static function getInstance()
    {
        if (!isset(self::$instance)) {
            $c = __CLASS__;
            self::$instance = new $c;
        }
        return self::$instance;
    }

    public $project;
    public $appConf;

    public $availableProject = array();

    private function __construct()
    {
        $this->appConf = Config::getInstance()->getConf();

        $i=0;
        while( list($k, $v) = each($this->appConf) ) {
            if( $k == "GLOBAL_CONFIGURATION" ) { continue; }

            // Check if this project is enable
            if( $this->appConf[$k]['project.enable'] == "1" )
            {
                $this->availableProject[$i] = array(
                    'code'                => $this->appConf[$k]['project.code'],
                    'iconCls'             => $this->appConf[$k]['project.iconCls'],
                    'name'                => $this->appConf[$k]['project.name'],
                    'request_account_uri' => $this->appConf[$k]['account.request.url']
                );

                ++$i;
            }
        }
    }

    public function getAvailableProject()
    {
        return $this->availableProject;
    }

    public function setProject($project)
    {
        $project = strtoupper($project);

        // This project must be defined in $availableProject constant
        if( !isset($this->appConf[$project]) || $this->appConf[$project]['project.enable'] == false ) {
            return false;
        }

        $this->project = $project;
        AccountManager::getInstance()->project = $project;
        $_SESSION['project'] = $project;
        return true;
    }
}
?>
