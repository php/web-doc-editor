<?php
/*
 *  A class to manage a dictionary
 *
 */

require_once dirname(__FILE__) . '/DBConnection.php';

class DictionaryManager {

    private static $instance;
    public $acronyms;
    public $entities;
    private $conn;

    /**
     * @static
     * @return DictionaryManager
     */
    public static function getInstance()
    {
        if (!isset(self::$instance)) {
            $c = __CLASS__;
            self::$instance = new $c;
        }
        return self::$instance;
    }

    public function __construct()
    {
        $this->conn = DBConnection::getInstance();
    }

    /**
     * Delete a given word.
     * @param $wordId : Database Id for the word we want to delete
     *
     */
    public function delWord($wordId)
    {
        $s = 'DELETE FROM `dictionary` WHERE `id`=%d';
        $params = array($wordId);

        $this->conn->query($s, $params);
    }

    /**
     * Get all words for a given project/lang.
     *
     */
    public function getWords()
    {
        $am = AccountManager::getInstance();
        $project = $am->project;
        $vcsLang = $am->vcsLang;

        $s = 'SELECT `id`, `valueEn`, `valueLang`, `lastUser`, `lastDate` FROM `dictionary` WHERE `project` = "%s" AND `lang`="%s"';
        $params = array($project, $vcsLang);

        $r = $this->conn->query($s, $params);

        $infos = array();
        while ($a = $r->fetch_assoc()) {
            $infos[] = $a;
        }

        return $infos;
    }

    /**
     * Manage a word ; Add or update a word base on his wordId.
     * If wordId is "new", the word is added, else it was updated
     * @param $wordId : Database Id for the word or "new" if we want to add it
     * @param $valueEn : New English value
     * @param $valueLang : New lang value
     *
     */
    public function manageDictionaryWord($wordId, $valueEn, $valueLang)
    {
        $am = AccountManager::getInstance();
        $vcsLogin = $am->vcsLogin;
        $project  = $am->project;
        $vcsLang  = $am->vcsLang;

        $time = @date("Y-m-d H:i:s");

        if( $wordId == 'new' ) {
            $s = 'INSERT INTO `dictionary` (`project`, `lang`, `valueEn`, `valueLang`, `lastUser`, `lastDate`) VALUES ("%s", "%s", "%s", "%s", "%s", "%s")';
            $params = array($project, $vcsLang, $valueEn, $valueLang, $vcsLogin, $time);
        } else {
            $s = 'UPDATE `dictionary` SET `valueEn` = "%s", `valueLang`= "%s", `lastUser` = "%s", `lastDate` = "%s" WHERE `id` = %d';
            $params = array($valueEn, $valueLang, $vcsLogin, $time, $wordId);
        }

        $this->conn->query($s, $params);

        return $time;
    }
}

?>
