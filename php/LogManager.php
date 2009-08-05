<?php

require_once dirname(__FILE__) . '/DBConnection.php';

class LogManager
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

    /**
     * Get all commit message.
     *
     * Each time we commit, we store in DB the commit message to be use later. This method get all this message from DB.
     *
     * @return An indexed array of commit message.
     */
    public function getCommitLog()
    {
        $result = array();

        $s = sprintf(
            'SELECT `id`, `text` FROM `commitMessage` WHERE userID="%s"',
            AccountManager::getInstance()->userID
        );
        $r = DBConnection::getInstance()->query($s);
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
        $log    = DBConnection::getInstance()->real_escape_string($log);
        $userID = AccountManager::getInstance()->userID;

        $s = sprintf(
            'SELECT id FROM `commitMessage` WHERE `text`="%s" AND `userID`="%s"',
            $log, $userID
        );
        $r = DBConnection::getInstance()->query($s);

        if ($r->num_rows == 0 ) {
            $s = sprintf(
                'INSERT INTO `commitMessage` (`text`,`userID`) VALUES ("%s", "%s")',
                $log, $userID
            );
            DBConnection::getInstance()->query($s);
        }
    }

    /**
     * Save an existing log message into DB.
     *
     * @param $messID The ID of the log message.
     * @param $mess The message.
     */
    public function updateCommitLog($logID, $log)
    {
        $s = sprintf(
            'UPDATE `commitMessage` SET `text`="%s" WHERE `id`="%s"',
            DBConnection::getInstance()->real_escape_string($log), $logID
        );
        DBConnection::getInstance()->query($s);
    }

    /**
     * Delete a log message into DB.
     *
     * @param $messID The ID of the log message.
     */
    public function delCommitLog($logID)
    {
        $s = sprintf(
            'DELETE FROM `commitMessage` WHERE `id`="%s"', $logID
        );
        DBConnection::getInstance()->query($s);
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
        $fp = fopen(DOC_EDITOR_VCS_PATH . '../.' . $file, 'w');
        fwrite($fp, implode("<br>",$output));
        fclose($fp);
    }

    /**
     * Get the content of a log file.
     *
     * @param $file The name of the file.
     * @return $content The content.
     */
    public function readOutputLog($file)
    {
        return file_get_contents(DOC_EDITOR_VCS_PATH . '../.' . $file);
    }

    /**
     * Save buildLog status.
     *
     * @param $lang The lang checked
     * @param $status The status of the build. 0 if the build is broken, 1 otherwise.
     */
    public function saveBuildLogStatus($lang, $status)
    {
        $s = sprintf(
            'INSERT INTO `buildLog` (`project`, `lang`, `status`, `date`)
             VALUES ("php","%s", "%s", now())',
            $lang, $status
        );
        DBConnection::getInstance()->query($s);
    }

    /**
     * Get buildLog data.
     */
    public function getBuildLogStatus()
    {
        $s = 'SELECT `id`, `lang`, `status`, `date` FROM `buildLog`';
        $r  = DBConnection::getInstance()->query($s);

        $node = array();
        while ($a = $r->fetch_assoc()) {
            $node[] = $a;
        }

        return array('nb' => $r->num_rows, 'node' => $node);
    }
}

?>
