<?php

require_once dirname(__FILE__) . '/AccountManager.php';
require_once dirname(__FILE__) . '/DBConnection.php';

class TranslatorStatistic
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
     * Get translators information.
     *
     * @return An associated array containing informations about translators.
     */
    public function getTranslators()
    {
        $s = sprintf(
            'SELECT `id`, `nick`, `name`, `mail`, `vcs` FROM `translators` WHERE `lang`="%s"',
            AccountManager::getInstance()->vcsLang
        );
        $result = DBConnection::getInstance()->query($s);

        $persons = array();
        while ($r = $result->fetch_array()) {
            $persons[$r['nick']] = array(
                'id'   => $r['id'],
                'name' => utf8_encode($r['name']),
                'mail' => $r['mail'],
                'vcs'  => $r['vcs']
            );
        }
        return $persons;
    }

    /**
     * Get number of uptodate files per translators.
     *
     * @return An associated array (key=>translator's nick, value=>nb files).
     */
    public function getUptodateFileCount()
    {
        $s = sprintf(
            'SELECT
                COUNT(`name`) AS total,
                `maintainer`
            FROM
                `files`
            WHERE
                `lang`="%s"
            AND
                `revision` = `en_revision`
            GROUP BY
                `maintainer`
            ORDER BY
                `maintainer`',
            AccountManager::getInstance()->vcsLang
        );
        $result = DBConnection::getInstance()->query($s);

        $tmp = array();
        while ($r = $result->fetch_array()) {
            $tmp[$r['maintainer']] = $r['total'];
        }
        return $tmp;
    }

    /**
     * Get number of old files per translators.
     *
     * @return An associated array (key=>translator's nick, value=>nb files).
     */
    public function getOldFileCount()
    {
        $s = sprintf(
            'SELECT
                COUNT(`name`) AS total,
                `maintainer`
            FROM
                `files`
            WHERE
                `lang`="%s"
            AND
                `en_revision` != `revision`
            AND
                `en_revision` - `revision` < 10
            AND
                `size_diff` < 3
            AND
                `mdate_diff` > -30
            AND
                `size` is not NULL
            GROUP BY
                `maintainer`
            ORDER BY
                `maintainer`',
            AccountManager::getInstance()->vcsLang
        );
        $result = DBConnection::getInstance()->query($s);

        $tmp = array();
        while ($r = $result->fetch_array()) {
            $tmp[$r['maintainer']] = $r['total'];
        }
        return $tmp;
    }

    /**
     * Get number of critical files per translators.
     *
     * @return An associated array (key=>translator's nick, value=>nb files).
     */
    public function getCriticalFileCount()
    {
        $s = sprintf(
            'SELECT
                COUNT(`name`) AS total,
                `maintainer`
            FROM
                `files`
            WHERE
                `lang`="%s"
            AND
                ( `en_revision` - `revision` >= 10  OR
                ( `en_revision` != `revision`  AND
                    ( `size_diff` >= 3 OR `mdate_diff` <= -30 )
                ))
            AND
                `size` is not NULL
            GROUP BY
                `maintainer`
            ORDER BY
                `maintainer`',
            AccountManager::getInstance()->vcsLang
        );
        $result = DBConnection::getInstance()->query($s);

        $tmp = array();
        while ($r = $result->fetch_array()) {
            $tmp[$r['maintainer']] = $r['total'];
        }
        return $tmp;
    }

    /**
     * Get statistics summary about translators.
     *
     * @return An indexed array containing statistics about translators (nb uptodate files, nb old files, etc...)
     */
    public function getSummary()
    {
        $translators = $this->getTranslators();
        $uptodate    = $this->getUptodateFileCount();
        $old         = $this->getOldFileCount();
        $critical    = $this->getCriticalFileCount();

        $i=0; $persons=array();
        foreach ($translators as $nick => $data) {
            $persons[$i]              = $data;
            $persons[$i]['nick']      = $nick;
            $persons[$i]['uptodate']  = isset($uptodate[$nick]) ? $uptodate[$nick] : '0';
            $persons[$i]['old']       = isset($old[$nick])      ? $old[$nick]      : '0';
            $persons[$i]['critical']  = isset($critical[$nick]) ? $critical[$nick] : '0';
            $persons[$i]['sum']       = $persons[$i]['uptodate'] + $persons[$i]['old'] + $persons[$i]['critical'];
            $i++;
        }
        return $persons;
    }
}

?>
