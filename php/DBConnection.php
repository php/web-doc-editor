<?php

require_once dirname(__FILE__) .'/Conf.php';
require_once dirname(__FILE__) .'/utility.php';

class DBConnection
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

    private $conn;

    private function __construct()
    {
        $appConf = Config::getInstance()->getConf();

        try {
            $this->conn = new mysqli(
                $appConf['GLOBAL_CONFIGURATION']['sql.host'],
                $appConf['GLOBAL_CONFIGURATION']['sql.user'],
                $appConf['GLOBAL_CONFIGURATION']['sql.passwd'],
                $appConf['GLOBAL_CONFIGURATION']['sql.database']
            );
            if (mysqli_connect_errno()) {
                throw new Exception('connect databases failed!');
            }
        } catch (Exception $e) {
            echo $e->getMessage();
            exit;
        }
    }

    public function query($s)
    {    
        $r = $this->conn->query($s) or die('Error: '.$this->conn->error.'|'.$s);
        return $r;
    }

    public function insert_id()
    {
        return $this->conn->insert_id;
    }

    public function num_rows()
    {
        return $this->conn->num_rows;
    }

    public function affected_rows()
    {
        return $this->conn->affected_rows;
    }

    public function real_escape_string($escape_str)
    {
        return $this->conn->real_escape_string($escape_str);
    }

    public function multi_query($s)
    {
        $r = $this->conn->multi_query($s) or die('Error: '.$this->conn->error.'|'.$s);
        return $r;
    }
}

?>
