<?php

require_once dirname(__FILE__) . '/conf.inc.php';

class VCSFactory {

    private static $instance;

    public static function getInstance()
    {
        if (!isset(self::$instance)) {
            switch ($GLOBALS['DOC_EDITOR_VCS']) {
                case 'cvs':
                    require_once dirname(__FILE__) . '/CvsClient.php';
                    self::$instance = CvsClient::getInstance();
                    break;
                case 'svn':
                    require_once dirname(__FILE__) . '/SvnClient.php';
                    self::$instance = SvnClient::getInstance();
                    break;
            }
        }
        return self::$instance;
    }

}

?>
