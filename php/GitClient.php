<?php


class GitClient
{
    private static $instance;

    /**
     * @static
     * @return GitClient
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
    }

    private function getKarmaList()
    {
        // If this data is older than 1 day, we update it
        $data = RepositoryFetcher::getStaticValue('karma_list', '');

        if( $data === false || ($data->update_time + (24*60*60)) > time() ) {
            $this->updateKarmaList();
            $data = RepositoryFetcher::getStaticValue('karma_list', '');
        }
        
        return $data->data;
    }

    private function updateKarmaList()
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $file = @file($appConf[$project]['vcs.karma.file']);

        $line_avail = array();
        $user = array();

        // We cleanUp the content of this file
        for( $i=0; $i < count($file); $i++) {
            if( substr($file[$i], 0, 6) == 'avail|') {
                $line_avail[] = $file[$i];

                $t = explode("|", $file[$i]);
                $users   = trim($t[1]);
                $karmas = ( isset($t[2]) ) ? trim($t[2]) : 'ALL';

                $users = explode(",", $users);
                $karmas = explode(",", $karmas);

                for( $j=0; $j < count($users); $j++ ) {
                    if( isset($user[$users[$j]]) ) {

                        $user[$users[$j]]['karma'] = array_merge( $karmas, $user[$users[$j]]['karma'] );

                    } else {

                        $user[$users[$j]]['karma'] = $karmas;
                    }
                }

            }
        }

        // We store this value into DB as json string to retrieve it later
        $to_store = array(
            "update_time" => time(),
            "data"        => $user
        );
        RepositoryManager::setStaticValue('karma_list', '', json_encode($to_store));

    }

    // Return true if the $user have the right karma for $module
    public function checkKarma($user, $lang)
    {
        $userList = $this->getKarmaList();

        $userList = (array) $userList;

        if( isset($userList[$user]) ) {

            $userList[$user] = (array) $userList[$user];

            $karma = $userList[$user]['karma'];

            // Must have ALL, phpdoc or phpdoc/$lang
            if( in_array("ALL", $karma) || in_array("phpdoc", $karma) || in_array("phpdoc/$lang", $karma) ) {
                return true;
            } else {
                return 'You haven\'t good Karma for the chosen language. Your Current karma is : '.implode(", ", $karma);
            }

        }
        return 'You haven\'t any karma !';

    }

    public function masterPhpAuthenticate($username, $password)
    {

        $post = http_build_query(
                array(
                        "token"    => getenv("TOKEN"),
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

        $s = file_get_contents("https://master.php.net/fetch/cvsauth.php", false, $ctx);

        $a = @unserialize($s);
        if (!is_array($a)) {
                return 'master.php.net seems to be down !';
        }
        if (isset($a["errno"])) {
                if( $a["errno"] == 0 ) { return 'git login failed'; }
                if( $a["errno"] == 1 ) { return 'Bad login'; }
                if( $a["errno"] == 2 ) { return 'Bad password'; }
        }

        return true;
    }

    /**

     *
     * @return An associative array{ 'err': git clone return code, 'output': git clone output contained in an array }
     *
     */
    public function checkout()
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $server  = $appConf[$project]['vcs.server'];
        $module = $appConf[$project]['vcs.module'];


        $commands = array(
            new ExecStatement('mkdir %s', array($appConf['GLOBAL_CONFIGURATION']['data.path'].$module)),
            new ExecStatement('cd %s', array($appConf['GLOBAL_CONFIGURATION']['data.path'].$module)),
            new ExecStatement('git init'),
            new ExecStatement('git remote add origin %s', array($server)),
            new ExecStatement('git config branch.master.remote origin'),
            new ExecStatement('git config branch.master.merge refs/heads/master'),
            new ExecStatement('git config user.name %s', array('Online Doc')),
            new ExecStatement('git config user.email %s', array('phd@php.net')),
            new ExecStatement('git config filter.rcs-keywords.clean %s', array('.git_filters/rcs-keywords.php.clean')),
            new ExecStatement('git config filter.rcs-keywords.smudge %s', array('.git_filters/rcs-keywords.php.smudge %f')),
            new ExecStatement('git pull 2>&1')
        );

        $err = 1;
        $trial_threshold = 3;
        $output = array();
        for ($trial = 0; $err != 0 && $trial < $trial_threshold; ++$trial) {
            array_push($output, "git clone trial #$trial\n");
            SaferExec::execMulti($commands, $output, $err); // if no err, err = 0
            if ($err == 0) array_push($output, "Success.\n");
        }

        return array('err' => $err, 'output' => $output);
    }

    public function fastUpdate()
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $commands = array(
            new ExecStatement('cd %s', array($appConf[$project]['vcs.path'])),
            // we separate pull on fetch and merge, because rcs-keywords work wrong with pull
            new ExecStatement('git fetch'),
            new ExecStatement('git merge origin/master 2>&1')
        );

        $err = 1;
        $trial_threshold = 3;
        $output = array();
        for ($trial = 0; $err != 0 && $trial < $trial_threshold; ++$trial) {
            SaferExec::execMulti($commands, $output, $err); // if no err, err = 0
        }

        if ($err == 0) {
            $revisions = '';
            foreach ($output as $string) {
                //Updating eccb880..aafe899
                if (preg_match('/^Updating\s([a-f0-9]+\.\.[a-f0-9]+)$/', $string, $matches)) {
                    $revisions = $matches[1];
                    break;
                }
            }
            if (!$revisions) return false;

            $commands = array(
                new ExecStatement('cd %s', array($appConf[$project]['vcs.path'])),
                new ExecStatement('git whatchanged %s 2>&1', array($revisions))
            );
            $err = 1;
            $trial_threshold = 3;
            $output = array();
            for ($trial = 0; $err != 0 && $trial < $trial_threshold; ++$trial) {
                SaferExec::execMulti($commands, $output, $err); // if no err, err = 0
            }
            if ($err == 0) {

                $delete_stack = $update_stack = $create_stack = array();
                // :100755 000000 e64f1c9... 0000000... D  PHPDoE_git_test/en/test.xml
                foreach ($output as $string) {
                    if (preg_match('/^:\d+\s+\d+\s+[a-f0-9]+\.\.\.\s+[a-f0-9]+\.\.\.\s+([DMA])\s+(.*)$/', $string, $matches)) {
                        if ($matches[1] == 'A') {
                            $create_stack[] = $matches[2];
                        } else if ($matches[1] == 'M') {
                            $update_stack[] = $matches[2];
                        } else {
                            $delete_stack[] = $matches[2];
                        }
                    }
                }

                return array(
                    'create' => $create_stack,
                    'update' => $update_stack,
                    'delete' => $delete_stack
                );
            } else {
                errlog(json_encode($output));
                return false;
            }
        } else {
            errlog(json_encode($output));
            return false;
        }


    }

    /**
     *  pull . under DOC_EDITOR_VCS_PATH
     * @return True if it does not report any error, false otherwise.
     */
    public function update()
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $commands = array(
            new ExecStatement('cd %s', array($appConf[$project]['vcs.path'])),
            // we separate pull on fetch and merge, because rcs-keywords work wrong with pull
            new ExecStatement('git fetch'),
            new ExecStatement('git merge origin/master 2>&1')
        );

        $err = 1;
        $trial_threshold = 3;
        $output = array();
        for ($trial = 0; $err != 0 && $trial < $trial_threshold; ++$trial) {
            array_push($output, "git pull trial #$trial\n");
            SaferExec::execMulti($commands, $output, $err); // if no err, err = 0
            if ($err == 0) array_push($output, "Success.\n");
        }

        if ($err == 0) {
            return true;
        } else {
            errlog(json_encode($output));
            return false;
        }
    }

    /**
     * Get git log of a specified file.
     *
     * @param $path The path of the file.
     * @param $file The name of the file.
     * @return An array containing all git log information.
     */
    public function log($path, $file)
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $commands = array(
            new ExecStatement('cd %s', array($appConf[$project]['vcs.path'].$path)),
            new ExecStatement('git log --format="%%H | %%at | %%an | %%s" -- %s', array($file))
        );

        $trial_threshold = 3;
        while ($trial_threshold-- > 0) {
            $output = array();
            SaferExec::execMulti($commands, $output);
            if (strlen(trim(implode('', $output))) != 0) break;
        }

        $part = $output;

        $final = array();
        for ($i=1; $i < count($part)-1; $i++ ) {

            $o = array();

            $o['id']  = $i;
            $o['raw'] = $part[$i];

            $contents = trim($part[$i]);
            $info = explode(' | ', $contents, 4);

            $o['revision'] = $info[0];
            $o['author']   = $info[2];
            $o['date']     = date('Y/m/d',$info[1]);
            
            $o['content']  = $info[3];

            $final[] = $o;
        }

        return $final;
    }

    /**
     * Execute git diff on specific file
     *
     * @param $path Path to file
     * @param $file Filename
     * @param $rev1 Diff revision 1
     * @param $rev2 Diff revision 2
     * @return Array of stdout of git diff
     */
    public function diff($path, $file, $rev1, $rev2)
    {
        if ($rev1 == 0) return '';
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $commands = array(
            new ExecStatement('cd %s', array($appConf[$project]['vcs.path'].$path)),
            new ExecStatement('git diff %s %s -- %s', array($rev1, $rev2, $file))
        );

        $trial_threshold = 3;
        while ($trial_threshold-- > 0) {
            $output = array();
            SaferExec::execMulti($commands, $output);
            if (strlen(trim(implode('', $output))) != 0) break;
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

    public function commitFolders($foldersPath)
    {

        return Array();
    }

    /**
     * Executes git commit
     *
     * @param $log Commit log
     * @param $create Array of files to be created
     * @param $update Array of files to be updated
     * @param $delete Array of files to be deleted
     * @return Associative array{ 'err': git ci return code, 'output': git ci output contained in an array }
     */
    public function commit($log, $create=false, $update=false, $delete=false)
    {
        $am        = AccountManager::getInstance();

        $appConf   = $am->appConf;
        $project   = $am->project;
        $vcsLang   = $am->vcsLang;
        $vcsLogin  = $am->vcsLogin;
        $vcsEmail  = $am->email;
        // Info we must store into DB
        $info = array();

        $pathLogFile = $this->createCommitLogFile($log);

        $create_stack = array();
        for ($i = 0; $create && $i < count($create); $i++) {
            $p_to = $create[$i]->full_path;
            $p_from = $create[$i]->full_new_path;
            $create_stack[] = $p_to;

            // Pre-commit : rename *-new/foo.xml to actual file
            @copy($p_from, $p_to);
        }

        $update_stack = array();
        for ($i = 0; $update && $i < count($update); $i++) {
            $p_to = $update[$i]->full_path;
            $p_from = $update[$i]->full_new_path;
            $update_stack[] = $p_to;

            // Pre-commit : rename *-new/foo.xml to actual file
            @copy($p_from, $p_to);
        }

        $delete_stack = array();
        for ($i = 0; $delete && $i < count($delete); $i++) {
            $delete_stack[] = $delete[$i]->full_path;
        }

        $info['nbFilesCreate'] = count($create_stack);
        $info['nbFilesDelete'] = count($delete_stack);
        $info['nbFilesUpdate'] = count($update_stack);

        $commands = array(
            new ExecStatement('cd %s', array($appConf[$project]['vcs.path']))
        );

        if ($info['nbFilesDelete'])
        {
            $commands[] = new ExecStatement('git rm' . str_repeat(' %s', $info['nbFilesDelete']), $delete_stack);
        }
        if ( $info['nbFilesCreate'])
        {
            $commands[] = new ExecStatement('git add' . str_repeat(' %s', $info['nbFilesCreate']), $create_stack);
        }
        if ($info['nbFilesUpdate'])
        {
            $commands[] = new ExecStatement('git add' . str_repeat(' %s', $info['nbFilesUpdate']), $update_stack);
        }

        $args = array_merge(
            array($pathLogFile, $vcsLogin.( $vcsEmail ? ' <'.$vcsEmail.'>' : '')),
            $update_stack,
            $delete_stack,
            $create_stack
        );

        $commands[] = new ExecStatement('git commit -F %s --author=%s --' . str_repeat(' %s', $info['nbFilesCreate'] + $info['nbFilesUpdate'] + $info['nbFilesDelete']).' 2>&1', $args);

        $err = 1;
        $trial_threshold = 3;
        $output = array();
        for ($trial = 0; $err != 0 && $trial < $trial_threshold; ++$trial) {
            array_push($output, "git commit trial #$trial\n");
            SaferExec::execMulti($commands, $output, $err); // if no err, err = 0
            if ($err == 0) array_push($output, "Success.\n");
        }


        // Delete tmp logMessage file
        $this->deleteCommitLogFile($pathLogFile);



        if ($err == 0) {

            // push changes to server
            $err = 1;
            $trial_threshold = 3;
            $temp_output = array();
            $commands = array(
                new ExecStatement('cd %s', array($appConf[$project]['vcs.path'])),
                new ExecStatement('git push 2>&1')
            );
            for ($trial = 0; $err != 0 && $trial < $trial_threshold; ++$trial) {
                array_push($output, "git push trial #$trial\n");
                SaferExec::execMulti($commands, $temp_output, $err); // if no err, err = 0
                if ($err == 0) array_push($output, "Success.\n");
            }



            // adding revision
            $err = 1;
            $trial_threshold = 3;
            $temp_output = array();
            $commands = array(
                new ExecStatement('cd %s', array($appConf[$project]['vcs.path']))
            );
            if ( $info['nbFilesCreate'])
            {
                $commands[] = new ExecStatement('rm' . str_repeat(' %s', $info['nbFilesCreate']), $create_stack);
                $commands[] = new ExecStatement('git checkout --' . str_repeat(' %s', $info['nbFilesCreate']), $create_stack);
            }
            if ($info['nbFilesUpdate'])
            {
                $commands[] = new ExecStatement('rm' . str_repeat(' %s', $info['nbFilesUpdate']), $update_stack);
                $commands[] = new ExecStatement('git checkout --' . str_repeat(' %s', $info['nbFilesUpdate']), $update_stack);
            }
            for ($trial = 0; $err != 0 && $trial < $trial_threshold; ++$trial) {
                SaferExec::execMulti($commands, $temp_output, $err); // if no err, err = 0
            }

            // We stock this info into DB
            $info['user'] = $vcsLogin;
            $info['lang'] = $vcsLang;
            RepositoryManager::getInstance()->setStaticValue('info', 'commitFiles', json_encode($info), true);
        } else {
            $this->revert($create, $update, $delete);
            errlog(json_encode($output));
        }

        return array('err' => $err, 'output' => $output);
    }

    public function revert($create=false, $update=false, $delete=false)
    {
        $am        = AccountManager::getInstance();

        $appConf   = $am->appConf;
        $project   = $am->project;

        $create_stack = array();
        for ($i = 0; $create && $i < count($create); $i++) {
            $create_stack[] = $create[$i]->full_path;
        }

        $update_stack = array();
        for ($i = 0; $update && $i < count($update); $i++) {
            $update_stack[] = $update[$i]->full_path;
        }

        $delete_stack = array();
        for ($i = 0; $delete && $i < count($delete); $i++) {
            $delete_stack[] = $delete[$i]->full_path;
        }

        $commands = array(
            new ExecStatement('cd %s', array($appConf[$project]['vcs.path'])),
            new ExecStatement('git checkout --' . str_repeat(' %s', count($create_stack) + count($update_stack) + count($delete_stack)) . ' 2>&1', array_merge($create_stack, $update_stack, $delete_stack))
        );

        $err = 1;
        $trial_threshold = 3;
        $output = array();
        for ($trial = 0; $err != 0 && $trial < $trial_threshold; ++$trial) {
            array_push($output, "git revert trial #$trial\n");
            SaferExec::execMulti($commands, $output, $err); // if no err, err = 0
            if ($err == 0) array_push($output, "Success.\n");
        }

        return array('err' => $err, 'output' => $output);
    }
}

?>
