<?php

require_once dirname(__FILE__) . '/VCSFactory.php';
require_once dirname(__FILE__) . '/DBConnection.php';
require_once dirname(__FILE__) . '/ProjectManager.php';

class AccountManager
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

    public $userID;
    public $project;
    public $vcsLogin;
    public $vcsPasswd;
    public $vcsLang;
    public $userConf;
    public $defaultConf;

    private function __construct()
    {
        $this->defaultConf = array(
            "onSaveLangFile"       => 'ask-me',

            "mainAppLoadMailsAtStartUp" => false,
            "mainAppLoadBugsAtStartUp"  => false,

            "newFileNbDisplay"      => 0, // 0 means no limit

            "needUpdateNbDisplay"   => 0, // 0 means no limit
            "needUpdateDiff"        => 'using-exec',
            "needUpdateDisplaylog"  => false,
            "needUpdateScrollbars"  => true,

            "errorDisplayLog"       => false,
            "errorScrollbars"       => true,
            "errorSkipNbLiteralTag" => true,

            "reviewedNbDisplay"     => 0, // 0 means no limit
            "reviewedDisplaylog"    => false,
            "reviewedScrollbars"    => true,

            "allFilesDisplayLog"    => false,

            "patchDisplayLog"       => false,
            "patchScrollbars"       => true,

            "theme"                 => 'themes/empty.css'
        );
    }

    public function switchLang($lang) {
        $_SESSION['lang'] = $lang;
        $this->vcsLang    = $lang;
    }

    /**
     * Update the date/time about the lastConnexion for this user, in DB
     */
    public function updateLastConnect()
    {
        $s = sprintf(
            'UPDATE `users` SET `last_connect`=now() WHERE `userID`="%s"',
            $this->userID
        );
        DBConnection::getInstance()->query($s);
    }

    /**
     * Check if there is an authentificated session or not
     * Update the last connexion's date in DB for this user
     *
     * @return TRUE if there is an authentificated session, FALSE otherwise.
     */
    public function isLogged()
    {
        if (!isset($_SESSION['userID'])) {
            return false;
        }
        $this->userID    = $_SESSION['userID'];
        $this->vcsLogin  = $_SESSION['vcsLogin'];
        $this->vcsPasswd = $_SESSION['vcsPasswd'];
        $this->vcsLang   = $_SESSION['lang'];
        $this->project   = $_SESSION['project'];

        ProjectManager::getInstance()->setProject($this->project);

        $this->userConf = isset($_SESSION['userConf'])
            ? $_SESSION['userConf']
            : $this->defaultConf;

        $this->updateLastConnect();

        return true;
    }

    /**
     * Log into this application.
     *
     * @param $project   The project we want to work on.
     * @param $vcsLogin  The login use to identify this user into PHP VCS server.
     * @param $vcsPasswd The password, in plain text, to identify this user into PHP VCS server.
     * @param $lang      The language we want to access.
     * @return An associated array.
     */
    public function login($project, $vcsLogin, $vcsPasswd, $lang='en')
    {

        // Var to return into ExtJs
        $return = array();

        // Var return from VCS auth system
        $AuthReturn = false;

        // We manage the project
        if( ProjectManager::getInstance()->setProject($project) ) {
            $this->project = $project;
        } else {
            $return['state'] = false;
            $return['msg']   = 'Bad project';
            $return['authMethod'] = '-';
            return $return;
        }

        // Special case for anonymous's user. Anonymous's user can logging into this app by providing this login/pass => anonymous/(empty) ou (empty)/(empty)
        // The result is the same. $this->vcsLogin will be "anonymous" and $this->vcsPasswd, (empty)
        if( ($vcsLogin == "anonymous" && $vcsPasswd == "")
         || ($vcsLogin == ""          && $vcsPasswd == "") ) {

           // We simulate an successfull authentication from VCS system
           $AuthReturn = true;

           // Even if the user provide an empty login, we force it to be 'anonymous'
           $vcsLogin  = 'anonymous';

        } // End anonymous's login
        else {

           // If this app is installed into Php's server, we use the standad way to verify login/password
           if( $_SERVER["SERVER_NAME"] == "doc.php.net" ) {
               // We try to authenticate this user to master php server.
               $AuthReturn = VCSFactory::getInstance()->masterPhpAuthenticate($vcsLogin, $vcsPasswd);
               $return['authMethod'] = 'masterPhp';
           } else {
               // We try to authenticate this user to VCS server.
               $AuthReturn = VCSFactory::getInstance()->svnAuthenticate($vcsLogin, $vcsPasswd);
               $return['authMethod'] = 'svnServer';
           }
        }

        if( $AuthReturn === true ) {

           // Check the karma
           $karma = VCSFactory::getInstance()->checkKarma($vcsLogin, $lang);

           if( $karma !== true ) {

               $return['state'] = false;
               $return['msg']   = $karma;

           }

           $this->vcsLogin  = $vcsLogin;
           $this->vcsPasswd = $vcsPasswd;
           $this->vcsLang   = $lang;

           // Is this user already exist on this server ? database check
           $s = sprintf(
               'SELECT * FROM `users` WHERE `vcs_login`="%s"',
               $vcsLogin
           );
           $r = DBConnection::getInstance()->query($s);

           if ($r->num_rows == 1) {

              //This user exist into DB. We store his configuration into ...
              $a = $r->fetch_object();

              // ... object's property ...
              $this->userConf = json_decode($a->conf);

              // ... and into the php's session
              $_SESSION['userID']    = $a->userID;
              $_SESSION['vcsLogin']  = $this->vcsLogin;
              $_SESSION['vcsPasswd'] = $this->vcsPasswd;
              $_SESSION['lang']      = $this->vcsLang;
              $_SESSION['userConf']  = $this->userConf;

              // We construct the return's var for ExtJs
              $return['state'] = true;
              $return['msg']   = 'Welcome !';


           } else {

              // We register this new valid user
              $userID = $this->register();

              //We store his configuration into object's property
              $_SESSION['userID']    = $userID;
              $_SESSION['vcsLogin']  = $this->vcsLogin;
              $_SESSION['vcsPasswd'] = $this->vcsPasswd;
              $_SESSION['lang']      = $this->vcsLang;
              $_SESSION['userConf']  = json_decode(json_encode($this->defaultConf));

              // We construct the return's var for ExtJs
              $return['state'] = true;

           }
        } elseif ($AuthReturn == 'Bad password') {

            // Authentication failed from the VCS server : bad password return
            $return['state'] = false;
            $return['msg']   = 'Bad vcs password';

        } else {

            //Authentication failed from the VCS server : others errors
            $return['state'] = false;
            $return['msg']   = 'unknow from vcs';
        }

        return $return;
    }

    /**
     * Register a new valid user on the application.
     *
     * @todo The VCS password is stored in plain text into the database for later use. We need to find something better
     * @return int The database insert id
     */
    private function register()
    {

        $db = DBConnection::getInstance();

        $s = sprintf(
            'INSERT INTO `users` (`vcs_login`, `conf`) VALUES ("%s","%s")',
            $this->vcsLogin, $db->real_escape_string(json_encode($this->defaultConf))
        );
        $db->query($s);
        return $db->insert_id();
    }

    /**
     * Update an option in user configuration database
     *
     * @param $item The name of the option.
     * @param $value The value of the option.
     */
    public function updateConf($item, $value)
    {

        if( $value == "false" ) {
            $value = false;
        }

        if( $value == "true" ) {
            $value = true;
        }

        // In session
        $this->userConf->$item = $value;
        $_SESSION['userConf']->$item = $value;
        $db = DBConnection::getInstance();

        // In DB
        $s = sprintf(
            'UPDATE `users` SET `conf`="%s" WHERE `vcs_login`="%s"',
            $db->real_escape_string(json_encode($this->userConf)), $this->vcsLogin
        );
        $db->query($s);

    }

    /**
     * Erase personal data. Delete all reference into the DB for this user.
     */
    public function eraseData()
    {

        $s = sprintf(
            'DELETE FROM `commitMessage` WHERE `userID`="%s"',
            $this->userID
        );
        DBConnection::getInstance()->query($s);

        $s = sprintf(
            'DELETE FROM `users` WHERE `userID`="%s"',
            $this->userID
        );
        DBConnection::getInstance()->query($s);
    }


    /**
     * Send an email.
     *
     * @param $to The Receiver.
     * @param $subject The subject of the email.
     * @param $msg The content of the email. Don't use HTML here ; only plain text.
     * @param $from The email we place into From header.
     */
    public function email($to, $subject, $msg, $from='')
    {
        if( $from != 'www' ) $from = $this->vcsLogin;

        $headers = 'From: '.$from.'@php.net' . "\r\n" .
                   'X-Mailer: PhpDocumentation Online Editor' ."\r\n" .
                   'Content-Type: text/plain; charset="utf-8"'."\n";

        mail($to, stripslashes($subject), stripslashes(trim($msg)), $headers);
    }
}

?>
