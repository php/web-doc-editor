<?php
/* 
 * 
 * 
 */

class UserNotes {

    private static $instance;

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

    public function getNotes($file)
    {
        $am = AccountManager::getInstance();
        $db = DBConnection::getInstance();
        $project = $am->project;

        $s = sprintf(
            'SELECT
                `id`, `user`, `date`, `note`
             FROM
                `userNotes`
             WHERE
                `project` = "%s" AND `file`="%s"',
            $project,
            $db->real_escape_string($file) // must be like this : fr/reference/cairo/cairocontext/appendpath.xml
        );

        $r = $db->query($s);

        $infos = array();
        while ($a = $r->fetch_assoc()) {
            $infos[] = $a;
        }

        return $infos;

    }

    public function addNote($file, $note)
    {
        $am = AccountManager::getInstance();
        $db = DBConnection::getInstance();
        $project  = $am->project;
        $vcsLogin = $am->vcsLogin;

        $s = sprintf(
            'INSERT INTO
                `userNotes`
                (`project`, `file`, `user`, `date`, `note`)
             VALUES
                ("%s", "%s", "%s", now(), "%s")',
            $project,
            $file,
            $vcsLogin,
            $db->real_escape_string($note)
        );

        $db->query($s);
    }

    public function delNote($noteID)
    {
        $am = AccountManager::getInstance();
        $db = DBConnection::getInstance();
        $vcsLogin = $am->vcsLogin;

        // A user can only delete his note. Not those of others users.
        $s = sprintf(
            'SELECT user FROM
                `userNotes`
             WHERE
                id = "%s"',
            $noteID
        );
        $r = $db->query($s);
        $a = $r->fetch_object();
        
        if( $a->user == $vcsLogin ) {
            // We can delete it
            $s = sprintf(
                'DELETE FROM
                    `userNotes`
                 WHERE
                    id = "%s"',
                $noteID
            );
            $db->query($s);
            return true;
        } else {
            return false;
        }
    }
}

?>
