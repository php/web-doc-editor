<?php

require_once dirname(__FILE__) . '/conf.inc.php';

class SvnClient
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

    private function __construct()
    {
    }

    private function getKarmaList() {

        // If this data is older than 1 day, we update it
        $data = RepositoryFetcher::getStaticValue('karma_list', '');

        if( $data === false || ($data["update_time"] + (24*60*60)) > time() ) {
            $this->updateKarmaList();
            $data = RepositoryFetcher::getStaticValue('karma_list', '');
        }
        return $data["data"];
    }

    private function updateKarmaList() {

        $file = @file($GLOBALS['DOC_EDITOR_VCS_KARMA_FILE']);

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

        if( isset($userList[$user]) ) {

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
                        "password" => $password,
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
        $uuid = md5(uniqid(rand(), true));
        $uuid =   substr($uuid, 0, 8)  . '-'
                . substr($uuid, 8, 4)  . '-'
                . substr($uuid, 12, 4) . '-'
                . substr($uuid, 16, 4) . '-'
                . substr($uuid, 20);

        $host = $GLOBALS['DOC_EDITOR_VCS_SERVER_HOST'];
        $port = $GLOBALS['DOC_EDITOR_VCS_SERVER_PORT'];
        $uri  = '/' . $GLOBALS['DOC_EDITOR_VCS_SERVER_REPOS'] . '!svn/act/'.$uuid;

        $ping = sprintf('MKACTIVITY %s HTTP/1.1
Host: %s
User-Agent: PhpDocumentation Online Editor
Connection: TE
TE: trailers
Accept-Encoding: gzip
DAV: http://subversion.tigris.org/xmlns/dav/svn/depth
DAV: http://subversion.tigris.org/xmlns/dav/svn/mergeinfo
DAV: http://subversion.tigris.org/xmlns/dav/svn/log-revprops
Content-Length: 0
Accept-Encoding: gzip

', $uri, $host);

        $h = @fsockopen($host, $port);

        if( !$h ) { return 'svn.php.net seems to be down !'; }

        $matches = array();
        $trial_count = 0;
        do {
            if ($trial_count++ == 3) return 'svn login failed';
            fwrite($h, $ping);
            $r = trim(fread($h, 1024));

            // connection may be closed, need retry
            $m = preg_match('/realm="(.+)", nonce="(.+)", .+ qop="(.+)"/', $r, $matches);
        } while (0 == $m);

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

        $pong = sprintf('MKACTIVITY %s HTTP/1.1
Host: %s
User-Agent: PhpDocumentation Online Editor
Connection: TE
TE: trailers
Accept-Encoding: gzip
DAV: http://subversion.tigris.org/xmlns/dav/svn/depth
DAV: http://subversion.tigris.org/xmlns/dav/svn/mergeinfo
DAV: http://subversion.tigris.org/xmlns/dav/svn/log-revprops
Content-Length: 0
Accept-Encoding: gzip
Authorization: Digest username="%s", realm="%s", nonce="%s", uri="%s", response="%s", algorithm="MD5", cnonce="%s", nc=00000001, qop="%s"

', $uri, $host, $username, $data['realm'], $data['nonce'], $uri, $response, $data['cnonce'], $data['qop']);

        fwrite($h, $pong);
        $r = trim(fread($h, 1024));

        fclose($h);

        if (preg_match('/HTTP\/1.1 201 Created/', $r)) {
            return true;
        } else {
            return 'Invalid Credentail';
        }
    }

    /**
     *  cd DOC_EDITOR_DATA_PATH
     *  svn co http://DOC_EDITOR_VCS_SERVER_HOST:DOC_EDITOR_VCS_SERVER_PORT/DOC_EDITOR_VCS_SERVER_PATH DOC_EDITOR_VCS_MODULE
     *
     *  see http://wiki.php.net/doc/scratchpad/howto/checkout
     */
    public function checkout()
    {
        $host   = $GLOBALS['DOC_EDITOR_VCS_SERVER_HOST'];
        $port   = $GLOBALS['DOC_EDITOR_VCS_SERVER_PORT'];
        $uri    = $GLOBALS['DOC_EDITOR_VCS_SERVER_PATH'];
        $module = $GLOBALS['DOC_EDITOR_VCS_MODULE'];

        $cmd = 'cd '.$GLOBALS['DOC_EDITOR_DATA_PATH'].'; '
              ."svn co http://$host:$port/$uri $module; ";

        $trial_threshold = 3;
        while ($trial_threshold-- > 0) {
            $output = array();
            exec($cmd, $output);
            if (strlen(trim(implode('', $output))) != 0) break;
        }
    }

    /**
     *  svn up . under DOC_EDITOR_VCS_PATH
     */
    public function update()
    {
        $cmd = 'cd '.$GLOBALS['DOC_EDITOR_VCS_PATH'].'; svn up .;';

        $trial_threshold = 3;
        while ($trial_threshold-- > 0) {
            $output = array();
            exec($cmd, $output);
            if (strlen(trim(implode('', $output))) != 0) break;
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
        $cmd = 'cd '.$GLOBALS['DOC_EDITOR_VCS_PATH'].$path.'; svn log '.$file;

        $trial_threshold = 3;
        while ($trial_threshold-- > 0) {
            $output = array();
            exec($cmd, $output);
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
        $cmd = 'cd '.$GLOBALS['DOC_EDITOR_VCS_PATH'].$path.'; svn diff -r '.$rev1.':'.$rev2.' '.$file;

        $trial_threshold = 3;
        while ($trial_threshold-- > 0) {
            $output = array();
            exec($cmd, $output);
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

    public function commitFolders($foldersPath) {

        $commitLogMessage = Array();

        for( $i=0; $i < count($foldersPath); $i++ ) {
            // We add this new folder into repository
            $vcsLogin  = AccountManager::getInstance()->vcsLogin;
            $vcsPasswd = AccountManager::getInstance()->vcsPasswd;

            $cmd = 'cd '.$GLOBALS['DOC_EDITOR_VCS_PATH'].'; svn add --non-recursive '.$foldersPath[$i]->lang.$foldersPath[$i]->path.'; svn ci --no-auth-cache --non-interactive -m "Add new folder from PhpDocumentation Online Editor" --username '.$vcsLogin.' --password '.$vcsPasswd.' '.$foldersPath[$i]->lang.$foldersPath[$i]->path;

            $trial_threshold = 3;
            while ($trial_threshold-- > 0) {
                $output = array();
                exec($cmd, $output);
                if (strlen(trim(implode('', $output))) != 0) break;
            }
            $commitLogMessage = array_merge($commitLogMessage, $output);
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
     * @return Array of stdout of svn commit
     */
    public function commit($log, $create=false, $update=false, $delete=false)
    {

        $pathLogFile = $this->createCommitLogFile($log);

        $create_stack = array();
        for ($i = 0; $create && $i < count($create); $i++) {
            $p = $create[$i]->lang.'/'.$create[$i]->path.'/'.$create[$i]->name;
            $create_stack[] = $p;

            // Pre-commit : rename .new to actual file
            @copy(  $GLOBALS['DOC_EDITOR_VCS_PATH'].$p.'.new', $GLOBALS['DOC_EDITOR_VCS_PATH'].$p);
            @unlink($GLOBALS['DOC_EDITOR_VCS_PATH'].$p.'.new');
        }

        $update_stack = array();
        for ($i = 0; $update && $i < count($update); $i++) {
            $p = $update[$i]->lang.'/'.$update[$i]->path.'/'.$update[$i]->name;
            $update_stack[] = $p;

            // Pre-commit : rename .new to actual file
            @copy(  $GLOBALS['DOC_EDITOR_VCS_PATH'].$p.'.new', $GLOBALS['DOC_EDITOR_VCS_PATH'].$p);
            @unlink($GLOBALS['DOC_EDITOR_VCS_PATH'].$p.'.new');
        }

        $delete_stack = array();
        for ($i = 0; $delete && $i < count($delete); $i++) {
            $delete_stack[] = $delete[$i]->lang.'/'.$delete[$i]->path.'/'.$delete[$i]->name;
        }

        // Linearization
        $filesCreate = implode($create_stack, ' ');
        $filesUpdate = implode($update_stack, ' ');
        $filesDelete = implode($delete_stack, ' ');

        // Buil the command line
        $vcsLogin  = AccountManager::getInstance()->vcsLogin;
        $vcsPasswd = AccountManager::getInstance()->vcsPasswd;

        $cmdCreate = $cmdDelete = '';
        if (trim($filesCreate) != '') {
            $cmdCreate = "svn add $filesCreate ; svn propset svn:keywords \"Id Rev Revision Date LastChangedDate LastChangedRevision Author LastChangedBy HeadURL URL\" $filesCreate ; svn propset svn:eol-style \"native\" $filesCreate ; ";
        }
        if (trim($filesDelete) != '') {
            $cmdDelete = "svn delete $filesDelete ; ";
        }

        // Escape single quote
        $log = str_replace("'", "\\'", $log);
        $cmd = $cmdDelete.
               $cmdCreate.
               "svn ci --no-auth-cache --non-interactive -F $pathLogFile --username $vcsLogin --password $vcsPasswd $filesUpdate $filesDelete $filesCreate";

        $cmd = 'cd '.$GLOBALS['DOC_EDITOR_VCS_PATH'].'; ' .$cmd;

        $trial_threshold = 3;
        while ($trial_threshold-- > 0) {
            $output = array();
            exec($cmd, $output);
            if (strlen(trim(implode('', $output))) != 0) break;
        }

        // Delete tmp logMessage file
        $this->deleteCommitLogFile($pathLogFile);

        return $output;
    }
}

?>
