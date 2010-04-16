<?php
/*
 *  A class to manage a dictionary
 * 
 */

class DictionaryManager {

    private static $instance;
    public $acronyms;
    public $entities;

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
    }

    /**
     * Delete a given word.
     * @param $wordId : Database Id for the word we want to delete
     *
     */
    public function delWord($wordId)
    {
        $s = sprintf(
            'DELETE FROM
                `dictionary`
             WHERE
                `id` = "%s"',

            $wordId
        );

        DBConnection::getInstance()->query($s);
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

        $s = sprintf(
            'SELECT
                `id`, `valueEn`, `valueLang`, `lastUser`, `lastDate`
             FROM
                `dictionary`
             WHERE
                `project` = "%s" AND `lang`="%s"',

            $project,
            $vcsLang
        );

        $r = DBConnection::getInstance()->query($s);

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
        $db = DBConnection::getInstance();
        $am = AccountManager::getInstance();
        $vcsLogin = $am->vcsLogin;
        $project  = $am->project;
        $vcsLang  = $am->vcsLang;

        $time = @date("Y-m-d H:i:s");

        if( $wordId == 'new' ) {

            $s = sprintf(
                'INSERT INTO
                    `dictionary`
                 (`project`, `lang`, `valueEn`, `valueLang`, `lastUser`, `lastDate`)
                 VALUES ("%s", "%s", "%s", "%s", "%s", "%s")',
                $project,
                $vcsLang,
                $db->real_escape_string($valueEn),
                $db->real_escape_string($valueLang),
                $db->real_escape_string($vcsLogin),
                $time
            );

        } else {

            $s = sprintf(
                'UPDATE
                    `dictionary`
                 SET
                    `valueEn`  = "%s",
                    `valueLang`= "%s",
                    `lastUser` = "%s",
                    `lastDate` = "%s"
                 WHERE
                    `id` = %s',

                $db->real_escape_string($valueEn),
                $db->real_escape_string($valueLang),
                $db->real_escape_string($vcsLogin),
                $time,
                $wordId
            );

        }

        $db->query($s);

        return $time;
    }
}

?>
