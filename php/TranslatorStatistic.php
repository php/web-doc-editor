<?php

require_once dirname(__FILE__) . '/AccountManager.php';
require_once dirname(__FILE__) . '/DBConnection.php';
require_once dirname(__FILE__) . '/RepositoryManager.php';

class TranslatorStatistic
{
    private static $instance;

    private $conn;

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
     * Get translators information.
     *
     * @param $lang Can be either 'all' for all availables languages, or one specific language
     * @return An associated array
     */
    public function getTranslators($lang='all')
    {
        $project = AccountManager::getInstance()->project;

        if( $lang == 'all' ) {
            $s =  'SELECT
                     `id`, `nick`, `name`, `mail`, `vcs`, `lang`
                   FROM
                     `translators`
                   WHERE
                     `project` = "%s"                                               
            ';
            $params = array($project);
        } else {
            $s =  'SELECT
                     `id`, `nick`, `name`, `mail`, `vcs`, `lang`
                   FROM
                     `translators`
                   WHERE
                     `project` = "%s" AND
                     `lang` = "%s"
            ';
            $params = array($project, $lang);
        }

        $result = $this->conn->query($s, $params);

        $persons = array();

        while ($r = $result->fetch_object()) {
            $persons[$r->lang][$r->nick] = array(
                'id'   => $r->id,
                'name' => utf8_encode($r->name),
                'mail' => $r->mail,
                'vcs'  => $r->vcs
            );
        }
        return $persons;
    }

    /**
     * Get number of uptodate files per translators.
     *
     * @param $lang Can be either 'all' for all availables languages, or one specific language
     * @return An associated array
     */
    public function getUptodateFileCount($lang='all')
    {
        $project = AccountManager::getInstance()->project;

        if( $lang == 'all' ) {
            $s = 'SELECT
                    COUNT(`name`) AS total,
                    `maintainer`,
                    `lang`
                FROM
                    `files`
                WHERE
                    `revision` = `en_revision` AND
                    `project` = "%s"
                GROUP BY
                    `maintainer`
                ORDER BY
                    `maintainer`
            ';
            $params = array($project);
        } else {
            $s = 'SELECT
                    COUNT(`name`) AS total,
                    `maintainer`,
                    `lang`
                FROM
                    `files`
                WHERE
                    `lang` = "%s"
                    `revision` = `en_revision` AND
                    `project` = "%s"
                GROUP BY
                    `maintainer`
                ORDER BY
                    `maintainer`
            ';
            $params = array($lang, $project);
        }

        $r = $this->conn->query($s, $params);

        $result = array();
        while ($a = $r->fetch_object()) {
            $result[$a->lang][$a->maintainer] = $a->total;
        }
        return $result;
    }

    /**
     * Get number of old files per translators.
     *
     * @param $lang Can be either 'all' for all availables languages, or one specific language
     * @return An associated array
     */
    public function getStaleFileCount($lang='all')
    {
        $project = AccountManager::getInstance()->project;

        if( $lang == 'all' ) {
            $s = 'SELECT
                    COUNT(`name`) AS total,
                    `maintainer`,
                    `lang`
                FROM
                    `files`
                WHERE
                    ' . $where . '
                    `en_revision` != `revision`
                AND
                    `size` is not NULL
                AND
                    `project` = "%s"
                GROUP BY
                    `maintainer`
                ORDER BY
                    `maintainer`
            ';
            $params = array($project);
        } else {
            $s = 'SELECT
                    COUNT(`name`) AS total,
                    `maintainer`,
                    `lang`
                FROM
                    `files`
                WHERE
                    `lang` = "%s"
                AND
                    `en_revision` != `revision`
                AND 
                    `size` is not NULL
                AND
                    `project` = "%s"
                GROUP BY
                    `maintainer`    
                ORDER BY
                    `maintainer`
            ';
            $params = array($lang, $project);
        }

        $r = $this->conn->query($s, $params);

        $result = array();
        while ($a = $r->fetch_object()) {
            $result[$a->lang][$a->maintainer] = $a->total;
        }
        return $result;
    }

    /**
     * Compute statistics summary about translators and store it into DB
     *
     * @param $lang Can be either 'all' for all availables languages, or one specific language
     */
    public function computeSummary($lang='all')
    {
        $rm        = RepositoryManager::getInstance();
        $translators = $this->getTranslators($lang);
        $uptodate    = $this->getUptodateFileCount($lang);
        $stale       = $this->getStaleFileCount($lang);

        if( $lang == 'all' ) {
            $hereLang = $rm->getExistingLanguage();
        } else {
            $hereLang = array(0 => Array("code" => $lang));
        }

        foreach( $hereLang as $lang ) {

            $lang = $lang["code"];

            if( $lang == 'en' ) { continue; }

            $i=0; $persons=array();

            if( isset($translators[$lang]) ) {

                foreach ($translators[$lang] as $nick => $data) {
                    $persons[$i]              = $data;
                    $persons[$i]['nick']      = $nick;
                    $persons[$i]['uptodate']  = isset($uptodate[$lang][$nick]) ? $uptodate[$lang][$nick] : '0';
                    $persons[$i]['stale']     = isset($stale[$lang][$nick])    ? $stale[$lang][$nick]    : '0';
                    $persons[$i]['sum']       = $persons[$i]['uptodate'] + $persons[$i]['stale'];
                    $i++;
                }

                // Save $summary into DB
                $rm->setStaticValue('translator_summary', $lang, json_encode($persons));
            }
        }
    }
}

?>
