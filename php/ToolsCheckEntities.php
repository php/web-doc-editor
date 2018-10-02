<?php

require_once dirname(__FILE__) . '/ProjectManager.php';
require_once dirname(__FILE__) . '/DBConnection.php';

/**
 * A class to check the entities
 * Original checkent script have been written by Georg Richter <georg@php.net> & Gabor Hojsty <goba@php.net>
 * you can found it here : https://svn.php.net/viewvc/web/doc/trunk/scripts/checkent.php?view=markup
 *
 */
class ToolsCheckEntities {

    private static $instance;

    private $urlConnectTimeout;
    private $userAgent;
    private $pathEntities;

    private $forkUrlAllow;
    private $forkNumAllowed;

    private $supportedSchemes;

    private $entityNames;
    private $entityUrls;

    private $conn;

    private $EntitiesNotChecked;

    /**
     * Initialise
     *
     */
    function __construct()
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        // This entities will not be checked as there are always wrong. We use it into the manual like this : "&url.foo;bar"
        // Entries should not include the & and ;
        $this->EntitiesNotChecked = Array(
            "url.pecl.package.get",
            "url.pecl.package",
        );

        $this->urlConnectTimeout = 10;

        $this->userAgent = 'DocWeb Link Crawler (http://doc.php.net)';
        $this->pathEntities = $appConf[$project]['entities.url'];

        $this->forkUrlAllow   = ( function_exists('pcntl_fork') && isset($_ENV['NUMFORKS']) );
        $this->forkNumAllowed = ( $this->forkUrlAllow ) ? $_ENV['NUMFORKS'] : 0;

        $this->supportedSchemes = Array('http');
        if (extension_loaded('openssl')) {
            $this->supportedSchemes[] = 'https';
        }
        if (function_exists('ftp_connect')) {
            $this->supportedSchemes[] = 'ftp';
        }

        $this->conn = DBConnection::getInstance();
    }

    /**
     * @static
     * @return ToolsCheckEntities
     */
    public static function getInstance()
    {
        if (!isset(self::$instance)) {
            $c = __CLASS__;
            self::$instance = new $c;
        }
        return self::$instance;
    }

    /**
     * Get check entities data.
     *
     * @return An indexed array readable by ExtJs
     */
    function getData()
    {
        $project = ProjectManager::getInstance()->project;

        $node = array();

        $s = 'SELECT
                  `entities`,
                  `url`,
                  `result`,
                  `date`

              FROM
                  `checkEntities`
              WHERE
                  `project` = "%s"
             ';
        $params = array($project);
        $r  = $this->conn->query($s, $params);
        $nb = $r->num_rows;
        $i = 0;
        while ($a = $r->fetch_array()) {

            $node[] = $a;

        } // While

        return array('nb' => $nb, 'node' => $node);

    }

    /**
     * Delete all rows into the table checkEntities
     *
     */
    private function cleanUpDatabase()
    {
        $project = ProjectManager::getInstance()->project;

        $this->conn->query('DELETE FROM `checkEntities` WHERE `project`="%s"', array($project));
    }


    /**
     * Read the content of the entities file
     *
     * @return The raw content, as a string
     */
    private function getEntitiesContent()
    {
        $file = @file_get_contents($this->pathEntities);

        if( $file ) {
            return $file;
        } else {
            echo "No entities found.\n";
            die();
        }
    }

    /**
     * Start the check.
     *
     */
    public function startCheck()
    {
        $project = ProjectManager::getInstance()->project;

        $this->cleanUpDatabase();

        $file = $this->getEntitiesContent();
        $array = explode('<!-- Obsoletes -->', $file);

        // Find entity names and URLs
        $schemes_preg = '(?:' . join('|', $this->supportedSchemes) . ')';
        preg_match_all("@<!ENTITY\s+(\S+)\s+([\"'])({$schemes_preg}://[^\\2]+)\\2\s*>@U", $array[0], $entitiesFound);

        // These are the useful parts
        $this->entityNames = $entitiesFound[1];
        $this->entityUrls  = $entitiesFound[3];

        if( $this->forkUrlAllow ) {
            // use the forking method ... MUCH faster
            declare(ticks=1);
            $children = 0;

            for( $num=0; $num < count($this->entityUrls); $num++ ) {

                $name = $this->entityNames[$num];
                $url  = $this->entityUrls[$num];

                if ($children < $this->forkNumAllowed) {
                    $pid = pcntl_fork();
                    if ($pid) {
                        // parent
                        ++$children;
                    } else {
                        // child

                        if( !in_array($name, $this->EntitiesNotChecked) )
                        {

                            $r = $this->checkUrl($num, $url);

                            $query = 'INSERT INTO `checkEntities` (`project`, `entities`, `url`, `result`, `date`)
                                VALUES ("%s", "%s", "%s", "%s", now())';
                            $params = array(
                                $project,
                                $name,
                                $url,
                                $r[0]
                            );
                            $this->conn->query($query, $params);

                        }
                        exit();
                    }
                } else {
                    // enough $children
                    $status = 0;
                    $child = pcntl_wait($status);
                    --$children;
                }
            }

            while ($children) {
                $status = 0;
                $child = pcntl_wait($status);
                --$children;
            }

        } else {
            // no forking
            // walk through entities found
            foreach ($this->entityUrls as $num => $entityUrl) {

                if( !in_array($this->entityNames[$num], $this->EntitiesNotChecked) )
                {
                    $r = $this->checkUrl($num, $entityUrl);

                    $query = 'INSERT INTO `checkEntities` (`project`, `entities`, `url`, `result`, `date`)
                        VALUES ("%s", "%s", "%s", "%s", now())';
                    $params = array(
                        $project,
                        $this->entityNames[$num],
                        $entityUrl,
                        $r[0]
                    );
                    $this->conn->query($query, $params);
                }

            }
            ++$num; // (for the count)
        }

    }

    /**
     * Checks a URL (actually fetches the URL and returns the status)
     *
     * @param int    $num        sequence number of URL
     * @param string $entityUrl URL to check
     * @return array
     */
    private function checkUrl ($num, $entityUrl)
    {
        static $old_host = '';

        // Get the parts of the URL
        $url    = parse_url($entityUrl);
        $entity = $this->entityNames[$num];

        // sleep if accessing the same host more that once in a row
        if ($url['host'] == $old_host) {
            sleep(5);
        } else {
            $old_host = $url['host'];
        }

        // Try to find host
        if (gethostbyname($url['host']) == $url['host']) {
            return array('UNKNOWN_HOST', array($num));
        }

        switch($url['scheme']) {

            case 'http':
            case 'https':
                if (isset($url['path'])) {
                    $url['path'] = $url['path'] . (isset($url['query']) ? '?' . $url['query'] : '');
                } else {
                    $url['path'] = '/';
                }

                /* check if using secure http */
                if ($url['scheme'] == 'https') {
                    $port   = 443;
                    $scheme = 'ssl://';
                } else {
                    $port   = 80;
                    $scheme = '';
                }
                $port = isset($url['port']) ? $url['port'] : $port;

                $junk = '';
                if (!$fp = @fsockopen($scheme . $url['host'], $port, $junk, $junk, $this->urlConnectTimeout)) {
                    return array('HTTP_CONNECT', array($num));

                } else {
                    $query = "HEAD {$url['path']} HTTP/1.0\r\n"
                            ."Host: {$url['host']}\r\n"
                            ."User-agent: ". $this->userAgent ."\r\n"
                            ."Connection: close\r\n"
                            ."\r\n";
                    fputs($fp, $query);

                    $str = '';
                    while (!feof($fp)) {
                        $str .= @fgets($fp, 2048);
                    }
                    fclose ($fp);

                    if (preg_match('@HTTP/1.\d (\d+)(?: .+)?@S', $str, $match)) {
                        if ($match[1] != '200') {
                            switch ($match[1])
                            {
                                case '500' :
                                case '501' :
                                    return array('HTTP_INTERNAL_ERROR', array($num));
                                break;

                                case '404' :
                                    return array('HTTP_NOT_FOUND', array($num));
                                break;

                                case '301' :
                                case '302' :
                                    if (preg_match('/Location: (.+)/', $str, $redir)) {
                                        return array('HTTP_MOVED', array($num, $this->fix_relative_url($redir[1], $url)));
                                    } else {
                                        return array('HTTP_WRONG_HEADER', array($num, $str));
                                    }
                                break;

                                default :
                                    return array('HTTP_WRONG_HEADER', array($num, $str));
                            }
                        } // error != 200
                    } else {
                        return array('HTTP_WRONG_HEADER', array($num, $str));
                    }
                }
                break;

            case 'ftp':
                if ($ftp = @ftp_connect($url['host'])) {

                    if (@ftp_login($ftp, 'anonymous', 'IEUser@')) {
                        $flist = ftp_nlist($ftp, $url['path']);
                        if (!count($flist)) {
                            return array('FTP_NO_FILE', array($num));
                        }
                    } else {
                        return array('FTP_LOGIN', array($num));
                    }
                    @ftp_quit($ftp);
                } else {
                    return array('FTP_CONNECT', array($num));
                }
                break;
        }
        return array('SUCCESS', array($num));
    }

    /**
     * Handles relative HTTP URLs (almost RFC 1808 compliant)
     *
     * @param string  $url    URL to handle
     * @param array   $parsed result of parse_url()
     * @return string fixed URL
     */
    private function fix_relative_url($url, $parsed)
    {
        if ($url{0} == '/') {
            return "{$parsed['scheme']}://{$parsed['host']}{$url}";
        }

        if (preg_match('@(?:f|ht)tps?://@S', $url)) {
            return $url;
        }

        /* handle ./ and . */
        if (substr($url, 0, 2) == './') {
            $url = substr($url, 2);
        } elseif ($url == '.') {
            $url = '';
        }

        $path = dirname($parsed['path']) . "/$url";
        $old  = '';

        /* handle ../ */
        do {
            $old  = $path;
            $path = preg_replace('@[^/:?]+/\.\./?@S', '', $path);
        } while ($old != $path);


        return "{$parsed['scheme']}://{$parsed['host']}{$path}";
    }

}
