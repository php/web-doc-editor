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

        $languages = ['en', 'ru'];
        foreach ($languages as $language) {
            $commands = [
                new ExecStatement('cd %s', [$appConf[$project]['vcs.path'] . $language]),
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

    public function svnAuthenticate($username, $password)
    {
        $am = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $uuid = md5(uniqid(rand(), true));
        $uuid = substr($uuid, 0, 8) . '-'
            . substr($uuid, 8, 4) . '-'
            . substr($uuid, 12, 4) . '-'
            . substr($uuid, 16, 4) . '-'
            . substr($uuid, 20);

        $host = $appConf[$project]['vcs.server.host'];
        $port = $appConf[$project]['vcs.server.port'];
        $full_host = ($port == 443 ? 'ssl://' : '') . $host;
        $uri = '/' . $appConf[$project]['vcs.server.repos'] . '!svn/act/' . $uuid;

        $ping = sprintf(
            "MKACTIVITY %s HTTP/1.1\r\nHost: %s\r\nUser-Agent: PhpDocumentation Online Editor\r\nConnection: TE\r\nTE: trailers\r\nAccept-Encoding: gzip\r\nDAV: http://subversion.tigris.org/xmlns/dav/svn/depth\r\nDAV: http://subversion.tigris.org/xmlns/dav/svn/mergeinfo\r\nDAV: http://subversion.tigris.org/xmlns/dav/svn/log-revprops\r\nContent-Length: 0\r\nAccept-Encoding: gzip\r\n\r\n",
            $uri,
            $host
        );

        $h = @fsockopen($full_host, $port);
        if (!$h) {
            return 'svn.php.net seems to be down !';
        }

        $matches = [];
        $trial_count = 0;
        do {
            if ($trial_count++ == 3) {
                return 'svn login failed';
            }
            fwrite($h, $ping);
            $r = trim(fread($h, 2048));

            // connection may be closed, need retry
            $m = preg_match('/realm="(.+)", nonce="(.+)", .+ qop="(.+)"/', $r, $matches);
        } while (0 == $m);
        fclose($h);

        $data = [
            'request' => 'MKACTIVITY',
            'realm' => $matches[1],
            'nonce' => $matches[2],
            'nc' => '00000001',
            'cnonce' => md5(uniqid(rand(), true)),
            'qop' => $matches[3],
        ];

        $A1 = md5($username . ':' . $data['realm'] . ':' . $password);
        $A2 = md5($data['request'] . ':' . $uri);
        $response = md5(
            $A1 . ':' . $data['nonce'] . ':' . $data['nc'] . ':' . $data['cnonce'] . ':' . $data['qop'] . ':' . $A2
        );

        $pong = sprintf(
            "MKACTIVITY %s HTTP/1.1\r\nHost: %s\r\nUser-Agent: PhpDocumentation Online Editor\r\nConnection: TE\r\nTE: trailers\r\nAccept-Encoding: gzip\r\nDAV: http://subversion.tigris.org/xmlns/dav/svn/depth\r\nDAV: http://subversion.tigris.org/xmlns/dav/svn/mergeinfo\r\nDAV: http://subversion.tigris.org/xmlns/dav/svn/log-revprops\r\nContent-Length: 0\r\nAccept-Encoding: gzip\r\nAuthorization: Digest username=\"%s\", realm=\"%s\", nonce=\"%s\", uri=\"%s\", response=\"%s\", algorithm=\"MD5\", cnonce=\"%s\", nc=00000001, qop=\"%s\"\r\n\r\n",
            $uri,
            $host,
            $username,
            $data['realm'],
            $data['nonce'],
            $uri,
            $response,
            $data['cnonce'],
            $data['qop']
        );

        $h = @fsockopen($full_host, $port);
        fwrite($h, $pong);
        $r = trim(fread($h, 2048));
        fclose($h);

        if (preg_match('/HTTP\/1.[01] 201 Created/', $r)) {
            return true;
        }

        return 'Invalid Credential';
    }
}