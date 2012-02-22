<?php

class VCSFactory
{

    private static $instance;

    /**
     * @static
     * @return CvsClient|SvnClient
     */
    public static function getInstance()
    {
        $appConf = AccountManager::getInstance()->appConf;

        if (!isset(self::$instance)) {
            switch ($appConf['GLOBAL_CONFIGURATION']['vcs.type']) {
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
