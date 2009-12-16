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
     * @param $logID The ID of the log message.
     * @param $log The message.
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
     * @param $logID The ID of the log message.
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
     * @return The content of the log file.
     */
    public function readOutputLog($file)
    {
        
        return $this->highlightBuildLog(file_get_contents(DOC_EDITOR_VCS_PATH . '../.' . $file));
    }

    /**
     * Save failed build log.
     *
     * @param $lang The lang checked
     * @param $log The content of the log
     */
    public function saveFailedBuild($lang, $log)
    {
        $s = sprintf(
            'INSERT INTO `failedBuildLog` (`project`, `lang`, `log`, `date`)
             VALUES ("php","%s", "%s", now())',
            $lang, DBConnection::getInstance()->real_escape_string(json_encode($log))
        );
        DBConnection::getInstance()->query($s);
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
        $s = 'SELECT `id`, `lang`, `date` FROM `failedBuildLog`';
        $r  = DBConnection::getInstance()->query($s);

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
     * @return The content of this failed build
     */
    public function getFailedBuildData($id)
    {
        $s = 'SELECT `log` FROM `failedBuildLog` WHERE `id`=\''.$id.'\'';
        $r  = DBConnection::getInstance()->query($s);

        $a = $r->fetch_object();

        return $this->highlightBuildLog(json_decode($a->log));
    }
}

?>
