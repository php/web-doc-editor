<?php

require_once dirname(__FILE__) . '/DBConnection.php';

class UserNotes {

    private static $instance;

    private $conn;

    /**
     * @static
     * @return UserNotes
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

    public function getNotes($file)
    {
        $am = AccountManager::getInstance();
        $project = $am->project;

        $s = 'SELECT
                `id`, `user`, `date`, `note`
             FROM
                `userNotes`
             WHERE
                `project` = "%s" AND `file`="%s"';
       $params = array(
            $project,
            $file // must be like this : fr/reference/cairo/cairocontext/appendpath.xml
        );

        $r = $this->conn->query($s, $params);

        $infos = array();
        while ($a = $r->fetch_assoc()) {
            $infos[] = $a;
        }

        return $infos;

    }

    public function addNote($file, $note)
    {
        $am = AccountManager::getInstance();
        $project  = $am->project;
        $vcsLogin = $am->vcsLogin;

        $s = 'INSERT INTO
                `userNotes`
                (`project`, `file`, `user`, `date`, `note`)
             VALUES
                ("%s", "%s", "%s", now(), "%s")';
        $params = array(
            $project,
            $file,
            $vcsLogin,
            $note
        );

        $this->conn->query($s, $params);
    }

    public function delNote($noteID)
    {
        $am = AccountManager::getInstance();
        $vcsLogin = $am->vcsLogin;

        // A user can only delete his note. Not those of others users.
        $s = 'SELECT user FROM
                `userNotes`
             WHERE
                id = %d';
        $params = array(
            $noteID
        );
        $r = $this->conn->query($s, $params);
        $a = $r->fetch_object();

        if( $a->user == $vcsLogin ) {
            // We can delete it
            $s = 'DELETE FROM
                    `userNotes`
                 WHERE
                    id = %d';
            $params = array(
                $noteID
            );
            $this->conn->query($s, $params);
            return true;
        } else {
            return false;
        }
    }
}

?>
