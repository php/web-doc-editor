<?php

class VCSFactory
{

    private static $instance;

    /**
     * @static
     * @return GitClient|SvnClient
     */
    public static function getInstance()
    {

        if (!isset(self::$instance)) {
            $appConf = AccountManager::getInstance()->appConf;
            switch ($appConf['GLOBAL_CONFIGURATION']['vcs.type']) {
                case 'git':
                    self::$instance = GitClient::getInstance();
                    break;
                case 'cvs':
                    self::$instance = CvsClient::getInstance();
                    break;
                case 'svn':
                    self::$instance = SvnClient::getInstance();
                    break;
            }
        }
        return self::$instance;
    }

}

?>
