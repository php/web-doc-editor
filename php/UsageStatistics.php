<?php

require_once dirname(__FILE__) . '/DBConnection.php';

class UsageStatistics {

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

    public function computeAll($startYear)
    {
        $_date = new DateTime($startYear.'-01-01');
        $now = new DateTime();
        $intervalle = new DateInterval('P1M');
        $now->add($intervalle); // We add one month to all wile statment to compute current month

        while( $_date->format('Y-m') != $now->format('Y-m') ) {

            echo 'Compute usage stats for '.$_date->format('Y-m').'...';
            $this->computeMonth($_date->format('Y-m'));
            echo "Done !\n";

            $_date->add($intervalle);

        }


    }

    public function computeMonth($yearMonth)
    {
        $am = AccountManager::getInstance();
        $project = $am->project;

        echo 'Compute usage stats for '.$yearMonth.'...';

        // We get all info for this Year-Month
        // $yearMonth is something like '2012-11'
        $tmp = explode('-', $yearMonth);
        $year = $tmp[0];
        $month = $tmp[1];

        $s = 'SELECT
                  *
              FROM
                  `staticValue`
              WHERE
                  `type` = "info" AND
                  YEAR(`date`) = "%s" AND
                  MONTH(`date`) = "%s" AND
                  `project` = "%s"';

       $params = array(
           $year,
           $month,
           $project
        );

        $r = $this->conn->query($s, $params);

        $stats = array(
            "nbCon"=> array(
                "total" => 0,
                "authService" => array(
                        "VCS" => 0,
                        "google" => 0,
                        "facebook" => 0
                    )
                ),
            "nbCreatedFiles"=>0,
            "nbDeletedFiles"=>0,
            "nbUpdatedFiles"=>0
        );

        while ($a = $r->fetch_object())
        {
            $i = "";

            // for connexions
            if( $a->field == "login" )
            {
                $i = json_decode($a->value);
                $stats["nbCon"]["authService"][$i->authService] ++;
                $stats["nbCon"]["total"] ++;
            }

            // for commit
            if( $a->field == "commitFiles" )
            {
                $i = json_decode($a->value);
                $stats['nbCreatedFiles'] += $i->nbFilesCreate;
                $stats['nbDeletedFiles'] += $i->nbFilesDelete;
                $stats['nbUpdatedFiles'] += $i->nbFilesUpdate;
            }

        }

        // Now we have stats for this Year-Month, we add it to DB

        $this->addModStat('nbCon', 'Total', $stats["nbCon"]["total"], $yearMonth);
        $this->addModStat('nbCon', 'VCS', $stats["nbCon"]["authService"]["VCS"], $yearMonth);
        $this->addModStat('nbCon', 'google', $stats["nbCon"]["authService"]["google"], $yearMonth);
        $this->addModStat('nbCon', 'facebook', $stats["nbCon"]["authService"]["facebook"], $yearMonth);
        $this->addModStat('nbCreatedFiles', '', $stats["nbCreatedFiles"], $yearMonth);
        $this->addModStat('nbDeletedFiles', '', $stats["nbDeletedFiles"], $yearMonth);
        $this->addModStat('nbUpdatedFiles', '', $stats["nbUpdatedFiles"], $yearMonth);

        echo "Done !\n";
    }

    private function addModStat($type, $subType, $value, $yearMonth)
    {
        $am = AccountManager::getInstance();
        $project = $am->project;

        $tmp = explode('-', $yearMonth);
        $year = $tmp[0];
        $month = $tmp[1];

        $s = '
            SELECT
                id
            FROM
                `usageStatistics`
            WHERE
                 `type` = "%s" AND
                 `subType` = "%s" AND
                 YEAR(`yearMonth`) = "%s" AND
                 MONTH(`yearMonth`) = "%s" AND
                 `project` = "%s"
        ';
        $params = array(
            $type,
            $subType,
            $year,
            $month,
            $project
        );

        $r = $this->conn->query($s, $params);
        $nb = $r->num_rows;

        if( $nb == 0 ) {
            // It's the first time we compute stats for this Year-Month. We add them into DB
            $s = 'INSERT INTO
                      `usageStatistics`
                  (
                      `project`,
                      `type`,
                      `subType`,
                      `value`,
                      `yearMonth`
                  ) VALUES (
                      "%s",
                      "%s",
                      "%s",
                      "%s",
                      "%s"
                  )';

            $params = array(
                $project,
                $type,
                $subType,
                $value,
                $year.'-'.$month.'-01'
            );
            $r = $this->conn->query($s, $params);

        } else {
            $a = $r->fetch_object();

            // It's not the first time, we update the record
            $s = 'UPDATE
                      `usageStatistics`
                  SET
                      `value`="%s"
                  WHERE
                      `id`="%s"
                  ';

            $params = array(
                $value,
                $a->id
            );

            $r = $this->conn->query($s, $params);

        }

    }
}

?>
