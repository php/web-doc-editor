<?php

require_once dirname(__FILE__) . '/SaferExec.php';

class GitClient
{
    private static $instance;

    /**
     * @static
     * @return CvsClient
     */
    public static function getInstance()
    {
        if (!isset(self::$instance)) {
            $c = __CLASS__;
            self::$instance = new $c;
        }
        return self::$instance;
    }

    public function update()
    {
        $appConf = AccountManager::getInstance()->appConf;
        $project = AccountManager::getInstance()->project;

        $languages = RepositoryManager::getInstance()->getAvailableLanguage();
        foreach ($languages as $language) {
            $commands = [
                new ExecStatement('cd %s', [$appConf[$project]['vcs.path'] . $language['code']]),
                new ExecStatement('git fetch'),
                new ExecStatement('git reset --hard origin/master'),
            ];
            SaferExec::execMulti($commands);
        }
    }

    public function diff($path, $file, $rev1, $rev2)
    {
        $am = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $commands = [
            new ExecStatement('cd %s', [$appConf[$project]['vcs.path'] . $path]),
            new ExecStatement('git diff %s %s -- %s', [$rev1, $rev2, $file])
        ];

        $trial_threshold = 3;
        while ($trial_threshold-- > 0) {
            $output = [];
            SaferExec::execMulti($commands, $output);
            if (strlen(trim(implode('', $output))) != 0) {
                break;
            }
        }

        return $output;
    }

    public function createCommitLogFile($log)
    {
        $path = tempnam(sys_get_temp_dir(), 'Doc_Editor_Commit_Log_Message');

        $handle = fopen($path, "w");
        fwrite($handle, $log);
        fclose($handle);

        return $path;
    }

    public function deleteCommitLogFile($path)
    {
        @unlink($path);
    }

    public function commit($log, $create = false, $update = false, $delete = false)
    {
        return ['err' => 0, 'output' => 'please commit outside PHPDocOE'];
    }

    public function commitFolders($foldersInfos) {

        return [];
    }

    public function updateSingleFolder($path) {

    }

    public function updateSingleFile($file) {

    }

    public function masterPhpAuthenticate($username, $password)
    {
        $am = AccountManager::getInstance();
        $appConf = $am->appConf;

        $post = http_build_query(
            array(
                "token"    => $appConf['GLOBAL_CONFIGURATION']['main.php.token'],
                "username" => $username,
                "password" => $password
            )
        );

        $opts = array(
            "method"  => "POST",
            "header"  => "Content-type: application/x-www-form-urlencoded",
            "content" => $post,
        );

        $ctx = stream_context_create(array("http" => $opts));

        $s = file_get_contents("https://main.php.net/fetch/cvsauth.php", false, $ctx);

        $a = @unserialize($s);
        if (!is_array($a)) {
            return 'main.php.net seems to be down !';
        }
        if (isset($a["errno"])) {
            if( $a["errno"] == 0 ) { return 'svn login failed'; }
            if( $a["errno"] == 1 ) { return 'Bad login'; }
            if( $a["errno"] == 2 ) { return 'Bad password'; }
        }

        return true;
    }
}