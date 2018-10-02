<?php

require_once dirname(__FILE__) . '/DBConnection.php';

class LogManager
{
    private static $instance;

    private $conn;

    /**
     * @static
     * @return LogManager
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
        $this->conn = DBConnection::getInstance();
    }

    /**
     * Get all commit message.
     *
     * Each time we commit, we store in DB the commit message to be use later. This method get all this message from DB.
     *
     * @return An indexed array of commit message.
     */
    public function getCommitLog()
    {
        $am = AccountManager::getInstance();
        $project = $am->project;
        $vcsLogin = $am->vcsLogin;

        $result = array();

        $s = 'SELECT `id`, `text` FROM `commitMessage` WHERE `project`="%s" AND `user`="%s" ORDER BY used DESC';
        $params = array($project, $vcsLogin);
        $r = $this->conn->query($s, $params);
        while ($a = $r->fetch_assoc()) {
            $result[] = $a;
        }

        return $result;
    }

    /**
     * Add a commit log to the DB (if not exist).
     *
     * @param $log The commit log message to be added if it don't exist yet.
     * @return Nothing.
     */
    public function addCommitLog($log)
    {
        $am       = AccountManager::getInstance();
        $project  = $am->project;
        $vcsLogin = $am->vcsLogin;

        $s = 'SELECT id, used FROM `commitMessage` WHERE `project`="%s" AND `text`="%s" AND `user`="%s"';
        $params = array($project, $log, $vcsLogin);
        $r = $this->conn->query($s, $params);

        if ($r->num_rows == 0 ) {
            $s = 'INSERT INTO `commitMessage` (`project`, `text`,`user`) VALUES ("%s", "%s", "%s")';
            $params = array($project, $log, $vcsLogin);
            $this->conn->query($s, $params);
        } else {
            $a = $r->fetch_object();
            $s = 'UPDATE `commitMessage` SET `used` = %d WHERE id=%d';
            $newUsed = $a->used + 1;
            $params = array($newUsed, $a->id);
            $this->conn->query($s, $params);
        }
    }

    /**
     * Save an existing log message into DB.
     *
     * @param $logID The ID of the log message.
     * @param $log The message.
     */
    public function updateCommitLog($logID, $log)
    {
        $s = 'UPDATE `commitMessage` SET `text`="%s" WHERE `id`=%d';
        $params = array($log, $logID);
        $this->conn->query($s, $params);
    }

    /**
     * Delete a log message into DB.
     *
     * @param $logID The ID of the log message.
     */
    public function delCommitLog($logID)
    {
        $s = 'DELETE FROM `commitMessage` WHERE `id`=%d';
        $params = array($logID);
        $this->conn->query($s, $params);
    }

    /**
     * Save Output message into a log file.
     *
     * @param $file The name of the file.
     * @param $output The output message.
     * @return Nothing.
     */
    public function saveOutputLog($file, $output)
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        $fp = fopen($appConf[$project]['vcs.path'] . '../.' . basename($file), 'w');
        fwrite($fp, implode("<br>",$output));
        fclose($fp);
    }

    /**
     * Get the content of a log file.
     *
     * @param $file The name of the file.
     * @return The content of the log file.
     */
    public function readOutputLog($file)
    {
        $am      = AccountManager::getInstance();
        $appConf = $am->appConf;
        $project = $am->project;

        return $this->highlightBuildLog(file_get_contents($appConf[$project]['vcs.path'] . '../.' . basename($file)));
    }

    /**
     * Save failed build log.
     *
     * @param $lang The lang checked
     * @param $log The content of the log
     */
    public function saveFailedBuild($lang, $log)
    {
        $project = AccountManager::getInstance()->project;

        $s = 'INSERT INTO `failedBuildLog` (`project`, `lang`, `log`, `date`)
             VALUES ("%s","%s", "%s", now())';
        $params = array($project, $lang, json_encode($log));
        $this->conn->query($s, $params);
    }

    /**
     * Highlight buildLog with some colors.
     *
     * @param $content The content of the log we want to highlight
     * @return The log highlighted
     */
    public function highlightBuildLog($content)
    {

         $reg_red = array(
             '/(Warning: )/',
             '/(Notice: )/',
             '/(Eyh man. No worries. Happ shittens. Try again after fixing the errors above.)/'
         );

         $reg_blue = array(
             '/(Loading and parsing manual.xml...)/',
             '/(Checking )/',
             '/(Saving it...)/',
             '/(Generating )/',
             '/( on line )/',
             '/(line: )/',
             '/(Creating file )/'
         );

        $content = preg_replace(
            $reg_red,
            '<span style="color: #c22900; font-weight: bold;">$1</span>',
            $content
        );

        $content = preg_replace(
            $reg_blue,
            '<span style="color: #418bd4; font-weight: bold;">$1</span>',
            $content
        );

         return $content;
    }

    /**
     * Get the list of failed build.
     */
    public function getFailedBuild()
    {
        $project = AccountManager::getInstance()->project;

        $s = 'SELECT `id`, `lang`, `date` FROM `failedBuildLog` WHERE `project` = "%s"';
        $params = array($project);
        $r  = $this->conn->query($s, $params);

        $node = array();
        while ($a = $r->fetch_assoc()) {
            $node[] = $a;
        }

        return array('nb' => $r->num_rows, 'node' => $node);
    }

    /**
     * Get the data about a failed build.
     *
     * @param $id The id of the failed build into DB we want to retrieve
     * @param $highlight If set to true (default), some elements of the content is html-highlighted.
     * @return The content of this failed build
     */
    public function getFailedBuildData($id, $highlight=true)
    {
        $s = 'SELECT `log` FROM `failedBuildLog` WHERE `id`=%d';
        $params = array($id);
        $r  = $this->conn->query($s, $params);

        $a = $r->fetch_object();

        return ($highlight) ? $this->highlightBuildLog(json_decode($a->log)) : json_decode($a->log);
    }
}

?>
