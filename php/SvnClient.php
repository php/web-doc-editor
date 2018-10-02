<?php

require_once dirname(__FILE__) . '/SaferExec.php';

class SvnClient
{
    private static $instance;

    /**
     * @static
     * @return SvnClient
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
                return 'svn.php.net seems to be down !';
        }
        if (isset($a["errno"])) {
                if( $a["errno"] == 0 ) { return 'svn login failed'; }
                if( $a["errno"] == 1 ) { return 'Bad login'; }
                if( $a["errno"] == 2 ) { return 'Bad password'; }
        }

        return true;
    }

    /**
     * Test the SVN credentials against the server
     * ref - http://www.php.net/manual/en/features.http-auth.php
     *
     * @param $username svn login name.
     * @param $password svn login password.
     * @return TRUE if the loggin success, error message otherwise.
     */
    public function svnAuthenticate($username, $password)
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $uuid = md5(uniqid(rand(), true));
        $uuid =   substr($uuid, 0, 8)  . '-'
                . substr($uuid, 8, 4)  . '-'
                . substr($uuid, 12, 4) . '-'
                . substr($uuid, 16, 4) . '-'
                . substr($uuid, 20);

        $host = $appConf[$project]['vcs.server.host'];
        $port = $appConf[$project]['vcs.server.port'];
        $full_host = ($port == 443 ? 'ssl://' : '') . $host;
        $uri  = '/' . $appConf[$project]['vcs.server.repos'] . '!svn/act/'.$uuid;

        $ping = sprintf("MKACTIVITY %s HTTP/1.1\r\nHost: %s\r\nUser-Agent: PhpDocumentation Online Editor\r\nConnection: TE\r\nTE: trailers\r\nAccept-Encoding: gzip\r\nDAV: http://subversion.tigris.org/xmlns/dav/svn/depth\r\nDAV: http://subversion.tigris.org/xmlns/dav/svn/mergeinfo\r\nDAV: http://subversion.tigris.org/xmlns/dav/svn/log-revprops\r\nContent-Length: 0\r\nAccept-Encoding: gzip\r\n\r\n", $uri, $host);

        $h = @fsockopen($full_host, $port);
        if( !$h ) { return 'svn.php.net seems to be down !'; }

        $matches = array();
        $trial_count = 0;
        do {
            if ($trial_count++ == 3) return 'svn login failed';
            fwrite($h, $ping);
            $r = trim(fread($h, 2048));

            // connection may be closed, need retry
            $m = preg_match('/realm="(.+)", nonce="(.+)", .+ qop="(.+)"/', $r, $matches);
        } while (0 == $m);
        fclose($h);

        $data = array(
            'request' => 'MKACTIVITY',
            'realm'   => $matches[1],
            'nonce'   => $matches[2],
            'nc'      => '00000001',
            'cnonce'  => md5(uniqid(rand(), true)),
            'qop'     => $matches[3],
        );

        $A1 = md5($username . ':' . $data['realm'] . ':' . $password);
        $A2 = md5($data['request'].':'.$uri);
        $response = md5($A1.':'.$data['nonce'].':'.$data['nc'].':'.$data['cnonce'].':'.$data['qop'].':'.$A2);

        $pong = sprintf("MKACTIVITY %s HTTP/1.1\r\nHost: %s\r\nUser-Agent: PhpDocumentation Online Editor\r\nConnection: TE\r\nTE: trailers\r\nAccept-Encoding: gzip\r\nDAV: http://subversion.tigris.org/xmlns/dav/svn/depth\r\nDAV: http://subversion.tigris.org/xmlns/dav/svn/mergeinfo\r\nDAV: http://subversion.tigris.org/xmlns/dav/svn/log-revprops\r\nContent-Length: 0\r\nAccept-Encoding: gzip\r\nAuthorization: Digest username=\"%s\", realm=\"%s\", nonce=\"%s\", uri=\"%s\", response=\"%s\", algorithm=\"MD5\", cnonce=\"%s\", nc=00000001, qop=\"%s\"\r\n\r\n", $uri, $host, $username, $data['realm'], $data['nonce'], $uri, $response, $data['cnonce'], $data['qop']);

        $h = @fsockopen($full_host, $port);
        fwrite($h, $pong);
        $r = trim(fread($h, 2048));
        fclose($h);

        if (preg_match('/HTTP\/1.[01] 201 Created/', $r)) {
            return true;
        } else {
            return 'Invalid Credential';
        }
    }

    /**
     *  cd DOC_EDITOR_DATA_PATH
     *  svn co http://DOC_EDITOR_VCS_SERVER_HOST:DOC_EDITOR_VCS_SERVER_PORT/DOC_EDITOR_VCS_SERVER_PATH DOC_EDITOR_VCS_MODULE
     *
     * @return An associative array{ 'err': svn co return code, 'output': svn co output contained in an array }
     *
     *  see http://wiki.php.net/doc/scratchpad/howto/checkout
     */
    public function checkout()
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $host   = $appConf[$project]['vcs.server.host'];
        $port   = $appConf[$project]['vcs.server.port'];
        $uri    = $appConf[$project]['vcs.server.path'];
        $module = $appConf[$project]['vcs.module'];
        $scheme = ($port == 443 ? 'https' : 'http');

        $commands = array(
            new ExecStatement('cd %s', array($appConf['GLOBAL_CONFIGURATION']['data.path'])),
            new ExecStatement('svn co %s %s 2>&1', array("$scheme://$host:$port/$uri", $module)),
        );

        $err = 1;
        $trial_threshold = 3;
        $output = array();
        for ($trial = 0; $err != 0 && $trial < $trial_threshold; ++$trial) {
            array_push($output, "svn co trial #$trial\n");
            SaferExec::execMulti($commands, $output, $err); // if no err, err = 0
            if ($err == 0) array_push($output, "Success.\n");
        }

        return array('err' => $err, 'output' => $output);
    }

    /**
     *  "svn up" on a single folder
     *
     * @param $path The path.
     * @return True if svn up does not report any error, false otherwise.
     */
    public function updateSingleFolder($path)
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $commands = array(
            new ExecStatement('cd %s', array($appConf[$project]['vcs.path'])),
            new ExecStatement('svn up %s 2>&1', array($path)),
        );

        $err = 1;
        $trial_threshold = 3;
        $output = array();
        for ($trial = 0; $err != 0 && $trial < $trial_threshold; ++$trial) {
            array_push($output, "svn up trial #$trial\n");
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
     *  "svn up" on a single File
     *
     * @param $file The file object.
     * @return True if svn up does not report any error, false otherwise.
     */
    public function updateSingleFile($file)
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $commands = array(
            new ExecStatement('cd %s', array($appConf[$project]['vcs.path'])),
            new ExecStatement('svn up %s 2>&1', array($file->full_path))
        );

        $err = 1;
        $trial_threshold = 3;
        $output = array();
        for ($trial = 0; $err != 0 && $trial < $trial_threshold; ++$trial) {
            array_push($output, "svn up trial #$trial\n");
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
     *  svn up . under DOC_EDITOR_VCS_PATH
     * @return True if svn up does not report any error, false otherwise.
     */
    public function update()
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $commands = array(
            new ExecStatement('cd %s', array($appConf[$project]['vcs.path'])),
            new ExecStatement('svn up . 2>&1')
        );

        $err = 1;
        $trial_threshold = 3;
        $output = array();
        for ($trial = 0; $err != 0 && $trial < $trial_threshold; ++$trial) {
            array_push($output, "svn up trial #$trial\n");
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
     * Get Svn log of a specified file.
     *
     * @param $path The path of the file.
     * @param $file The name of the file.
     * @return An array containing all Svn log information.
     */
    public function log($path, $file)
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $commands = array(
            new ExecStatement('cd %s', array($appConf[$project]['vcs.path'].$path)),
            new ExecStatement('svn log %s', array($file))
        );

        $trial_threshold = 3;
        while ($trial_threshold-- > 0) {
            $output = array();
            SaferExec::execMulti($commands, $output);
            if (strlen(trim(implode('', $output))) != 0) break;
        }

        $output = implode("\n", $output)."\n";

        $part = explode('------------------------------------------------------------------------'."\n", $output);

        $final = array();
        for ($i=1; $i < count($part)-1; $i++ ) {

            $o = array();

            $o['id']  = $i;
            $o['raw'] = $part[$i];

            $contents = explode("\n", trim($part[$i]));
            $infos    = explode(' | ', array_shift($contents));
            array_shift($contents);

            $o['revision'] = str_replace('r', '', $infos[0]);
            $o['author']   = $infos[1];
            $o['date']     = str_replace('-', '/', array_shift(explode(' +', $infos[2])));

            if( $tmp = strstr($o['date'], " /", true) ) {
                $o['date'] = $tmp;
            }

            $o['content']  = str_replace("\n", '<br/>', trim(implode('<br/>', $contents)));

            $final[] = $o;
        }

        return $final;
    }

    /**
     * Execute svn diff on specific file
     *
     * @param $path Path to file
     * @param $file Filename
     * @param $rev1 Diff revision 1
     * @param $rev2 Diff revision 2
     * @return Array of stdout of svn diff
     */
    public function diff($path, $file, $rev1, $rev2)
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $commands = array(
            new ExecStatement('cd %s', array($appConf[$project]['vcs.path'].$path)),
            new ExecStatement('svn diff -r %d:%d %s', array((int)$rev1, (int)$rev2, $file))
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
        $am        = AccountManager::getInstance();
        $appConf   = $am->appConf;
        $project   = $am->project;
        $vcsLang   = $am->vcsLang;
        $vcsLogin  = $am->vcsLogin;
        $vcsPasswd = $am->vcsPasswd;

        $commitLogMessage = Array();

        while( list($path, $data) = each($foldersPath))
        {
            // We add this new folder into repository

            $commands = array(
                new ExecStatement('cd %s', array($appConf[$project]['vcs.path'])),
                new ExecStatement('svn add --non-recursive %s', array($path)),
                new ExecStatement('svn propset svn:ignore "entities.*.xml" %s', array($path)),
                new ExecStatement('svn ci --no-auth-cache --non-interactive -m "Add new folder from Php Docbook Online Editor" --username %s --password %s %s 2>&1', array($vcsLogin, $vcsPasswd, $path))
            );

            $err = 1;
            $trial_threshold = 3;
            $output = array();
            for ($trial = 0; $err != 0 && $trial < $trial_threshold; ++$trial) {
                array_push($output, "svn ci trial #$trial\n");
                SaferExec::execMulti($commands, $output, $err); // if no err, err = 0
                if ($err == 0) array_push($output, "Success.\n");
            }
            $commitLogMessage = array_merge($commitLogMessage, $output);
            if ($err != 0) break;
        }

        if ($err == 0) {
        // We stock this info into DB
            $value = array();
            $value['user'] = $vcsLogin;
            $value['lang'] = $vcsLang;
            $value['nbFolders'] = count($foldersPath);
            RepositoryManager::getInstance()->setStaticValue('info', 'commitFolders', json_encode($value), true);
        } else {
            errlog(json_encode($commitLogMessage));
        }

        return $commitLogMessage;
    }

    /**
     * Executes svn commit
     *
     * @param $log Commit log
     * @param $create Array of files to be created
     * @param $update Array of files to be updated
     * @param $delete Array of files to be deleted
     * @return Associative array{ 'err': svn ci return code, 'output': svn ci output contained in an array }
     */
    public function commit($log, $create=false, $update=false, $delete=false)
    {
        $am        = AccountManager::getInstance();

        $appConf   = $am->appConf;
        $project   = $am->project;
        $vcsLang   = $am->vcsLang;
        $vcsLogin  = $am->vcsLogin;
        $vcsPasswd = $am->vcsPasswd;

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

        if (!empty($delete_stack))
        {
            $commands[] = new ExecStatement('svn delete' . str_repeat(' %s', $info['nbFilesDelete']), $delete_stack);
        }
        if (!empty($create_stack))
        {
            $commands[] = new ExecStatement('svn add' . str_repeat(' %s', $info['nbFilesCreate']), $create_stack);
            $commands[] = new ExecStatement('svn propset svn:keywords "Id Rev Revision Date LastChangedDate LastChangedRevision Author LastChangedBy HeadURL URL"' . str_repeat(' %s', $info['nbFilesCreate']), $create_stack);
            $commands[] = new ExecStatement('svn propset svn:eol-style "native"' . str_repeat(' %s', $info['nbFilesCreate']), $create_stack);
        }
        if (!empty($update_stack))
        {
            $commands[] = new ExecStatement('svn propset svn:keywords "Id Rev Revision Date LastChangedDate LastChangedRevision Author LastChangedBy HeadURL URL"' . str_repeat(' %s', $info['nbFilesUpdate']), $update_stack);
            $commands[] = new ExecStatement('svn propset svn:eol-style "native"' . str_repeat(' %s', $info['nbFilesUpdate']), $update_stack);
        }

        $args = array_merge(
            array($pathLogFile, $vcsLogin, $vcsPasswd),
            $update_stack,
            $delete_stack,
            $create_stack
        );

        $commands[] = new ExecStatement('export LC_ALL=en_US.UTF-8; svn ci --no-auth-cache --non-interactive -F %s --username %s --password %s' . str_repeat(' %s', $info['nbFilesCreate'] + $info['nbFilesUpdate'] + $info['nbFilesDelete']) . ' 2>&1', $args);

        $err = 1;
        $trial_threshold = 3;
        $output = array();
        for ($trial = 0; $err != 0 && $trial < $trial_threshold; ++$trial) {
            array_push($output, "svn ci trial #$trial\n");
            SaferExec::execMulti($commands, $output, $err); // if no err, err = 0
            if ($err == 0) array_push($output, "Success.\n");
        }

        // Delete tmp logMessage file
        $this->deleteCommitLogFile($pathLogFile);

        if ($err == 0) {
            // We stock this info into DB
            $info['user'] = $vcsLogin;
            $info['lang'] = $vcsLang;
            RepositoryManager::getInstance()->setStaticValue('info', 'commitFiles', json_encode($info), true);
        } else {
            $this->revert($create, $update, $delete);
            errlog(json_encode($output));
        }

        // Walk throw the output to filter some text
        $cleanOutput = array();

        for( $i=0; $i < count($output); $i++ ) {
            if( $output[$i] != "svn: warning: Can't open file '/root/.subversion/servers': Permission denied" ) {
                array_push($cleanOutput, $output[$i]);
            }
        }

        return array('err' => $err, 'output' => $cleanOutput);
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
            new ExecStatement('svn revert' . str_repeat(' %s', count($create_stack) + count($update_stack) + count($delete_stack)) . ' 2>&1', array_merge($create_stack, $update_stack, $delete_stack))
        );

        $err = 1;
        $trial_threshold = 3;
        $output = array();
        for ($trial = 0; $err != 0 && $trial < $trial_threshold; ++$trial) {
            array_push($output, "svn revert trial #$trial\n");
            SaferExec::execMulti($commands, $output, $err); // if no err, err = 0
            if ($err == 0) array_push($output, "Success.\n");
        }

        return array('err' => $err, 'output' => $output);
    }

    public function checkKeyWords($lang,$filePath,$fileName)
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $goodSVNKeywords = Array(
            0 => "Id",
            1 => "Rev",
            2 => "Revision",
            3 => "Date",
            4 => "LastChangedDate",
            5 => "LastChangedRevision",
            6 => "Author",
            7 => "LastChangedBy",
            8 => "HeadURL",
            9 => "URL"
            );

        $goodSVNEolStyle = Array(
            0 => "native"
            );

        $result = array(
            "keyWords" => false,
            "EolStyle" => false
            );
        $isDirty = false;


        $commands = array(
            new ExecStatement('cd %s', array($appConf[$project]['vcs.path'].$lang.$filePath)),
            new ExecStatement('svn proplist --xml --verbose %s', array($fileName))
        );

        $trial_threshold = 3;
        while ($trial_threshold-- > 0) {
            $output = array();
            SaferExec::execMulti($commands, $output);
            if (strlen(trim(implode('', $output))) != 0) break;
        }

        $outputXML = implode("\n", $output)."\n";

        $content = trim($outputXML);
        $content = str_replace("\r", " ", $content);
        $content = str_replace("\n", " ", $content);

        $content = simplexml_load_string($content);

        $keywords = array();

        for( $i=0; $i < count($content->target->property); $i++) {

            $attributName = "";
            $attributValue = "";

            $attributName = $content->target->property[$i]->attributes();
            $attributValue = (string) $content->target->property[$i][0];

            $attributName = explode(":",$attributName);
            $attributName = $attributName[1];

            $attributValue = explode(" ",$attributValue);

            $keywords[$attributName] = $attributValue;

        }

        // For keywords
        if( isset($keywords["keywords"]) ) {

            $diffKeywords = array_diff($goodSVNKeywords, $keywords["keywords"]);

            if( ! empty($diffKeywords) ) {

                $result['keyWords'] = implode(' ',$diffKeywords);
                $isDirty = true;
            }

        } else {
            $result['keyWords'] = implode(' ',$goodSVNKeywords);
            $isDirty = true;
        }

        // For eol-style
        if( isset($keywords["eol-style"]) ) {

            $diffEolStyle = array_diff($goodSVNEolStyle, $keywords["eol-style"]);

            if( ! empty($diffEolStyle) ) {

                $result['EolStyle'] = implode(' ',$diffEolStyle);
                $isDirty = true;

            }

        } else {
            $result['EolStyle'] = implode(' ',$goodSVNEolStyle);
            $isDirty = true;
        }

        // We send the result
        if( $isDirty ) {
            return $result;
        } else {
            return false;
        }


    }
}

?>
