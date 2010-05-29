<?php
/**
 * A class for managing account over the application.
 *
 */

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
    public $email;
    public $anonymousIdent;
    public $isAnonymous;
    public $defaultConf;
    public $appConf;

    private function __construct()
    {
        $this->defaultConf = (object) Array(
            'allFiles' => (object) Array(
                'enableSpellCheck' => false,
                'toolsPanelAcronymsLoad' => false,
                'toolsPanelDisplay' => false,
                'toolsPanelEntitiesLoad' => false,
                'toolsPanelLogLoad' => false,
                'toolsPanelWidth' => 375
            ),
            'error' => (object) Array(
                'descPanelDisplay' => true,
                'descPanelHeight' => 150,
                'enableSpellCheckEn' => false,
                'enableSpellCheckLang' => false,
                'nbDisplay' => 0,
                'skipNbLiteralTag' => true,
                'syncScrollbars' => true,
                'toolsPanelAcronymsLoad' => false,
                'toolsPanelDisplay' => false,
                'toolsPanelEntitiesLoad' => false,
                'toolsPanelLogLoad' => false,
                'toolsPanelWidth' => 375
            ),
            'main' => (object) Array(
                'loadBugsAtStartUp' => false,
                'loadMailsAtStartUp' => false,
                'mainMenuWidth' => 300,
                'onSaveFile' => 'ask-me',
                'theme' => 'themes/empty.css'
            ),
            'needUpdate' => (object) Array(
                'diffMethod'       => 'using-exec',
                'diffPanelDisplay' => true,
                'diffPanelHeight' => 150,
                'enableSpellCheckEn' => false,
                'enableSpellCheckLang' => false,
                'nbDisplay' => 0,
                'syncScrollbars' => true,
                'toolsPanelDisplay' => false,
                'toolsPanelLogLoad' => false,
                'toolsPanelWidth' => 375
            ),
            'newFile' => (object) Array(
                'enableSpellCheck' => false,
                'googlePanelDisplay' => true,
                'nbDisplay' => 0,
                'toolsPanelDisplay' => false,
                'toolsPanelWidth' => 375,
                'syncScrollbars' => true
            ),
            'reviewed' => (object) Array(
                'enableSpellCheckEn' => false,
                'enableSpellCheckLang' => false,
                'nbDisplay' => 0,
                'syncScrollbars' => true,
                'toolsPanelDisplay' => false,
                'toolsPanelLogLoad' => false,
                'toolsPanelWidth' => 375
            )
        );

        $this->appConf = Config::getInstance()->getConf();
    }

    /**
     * Change the current language
     * @param $lang string The new language we want to change to
     */
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
        $this->anonymousIdent = $_SESSION['anonymousIdent'];
        $this->isAnonymous = $_SESSION['isAnonymous'];
        $this->email = $_SESSION['email'];

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
     * @param $email     The email for this user. Need to contact him via the application.
     * @param $lang      The language we want to access.
     * @return An associated array.
     */
    public function login($project, $vcsLogin, $vcsPasswd, $email, $lang='en')
    {
        // Var to return into ExtJs
        $return = array();

        // Var return from VCS auth system
        $AuthReturn = false;

        // We manage the project
        if( ProjectManager::getInstance()->setProject($project) ) {
            $this->project = strtoupper($project);
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
           
           $this->isAnonymous = true;

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

           // We check if there is a cookie to identify this user. If not, we set one.
           $this->anonymousIdent = ( isset($_COOKIE['anonymousIdent']) ) ? $_COOKIE['anonymousIdent'] : uniqid('', true);
           setcookie("anonymousIdent", $this->anonymousIdent, time() + 3600*24*365, "/"); // One year ;)

           // Check the karma
           $karma = VCSFactory::getInstance()->checkKarma($vcsLogin, $lang);

           if( $karma !== true ) {

               $return['state'] = false;
               $return['msg']   = $karma;

           }

           $this->vcsLogin  = $vcsLogin;
           $this->vcsPasswd = $vcsPasswd;
           $this->vcsLang   = $lang;
           $this->email     = $email;

	       $s = sprintf(
	           'SELECT
	              *
	           FROM
	              `users`
	           WHERE
	              `project`        = "%s" AND
	              `vcs_login`      = "%s" AND
	              `anonymousIdent` = "%s" ',
	           $project,
	           $this->vcsLogin,
	           $this->anonymousIdent
	       );
           
           $r = DBConnection::getInstance()->query($s);

           if ($r->num_rows == 1) {

              //This user exist into DB. We store his configuration into ...
              $a = $r->fetch_object();

              // ... object's property ...
              $this->userConf = json_decode($a->conf);
              
              $this->userID = $a->userID;

              // ... and into the php's session
              $_SESSION['userID']  = $this->userID;
              $_SESSION['project'] = $this->project;
              if($this->vcsLogin=='anonymous'){
                  $_SESSION['vcsLogin'] = $this->vcsLogin = $this->vcsLogin.' #'.$a->userID;
              } else {
              	  $_SESSION['vcsLogin'] = $this->vcsLogin;
              }
              $_SESSION['vcsPasswd'] = $this->vcsPasswd;
              $_SESSION['isAnonymous'] = $this->isAnonymous;
              $_SESSION['anonymousIdent'] = $this->anonymousIdent;
              $_SESSION['lang']      = $this->vcsLang;
              $_SESSION['userConf']  = $this->userConf;
              $_SESSION['email']  = $this->email;
              
              // We update the email if this user have decided to change it.
              $this->updateEmail();

              // We construct the return's var for ExtJs
              $return['state'] = true;
              $return['msg']   = 'Welcome !';


           } else {

              // We register this new valid user
              $userID = $this->register();

              //We store his configuration into object's property
              $_SESSION['userID']    = $userID;
              if($this->vcsLogin=='anonymous'){
                  $_SESSION['vcsLogin'] = $this->vcsLogin = $this->vcsLogin.' #'.$userID;
              } else {
                  $_SESSION['vcsLogin'] = $this->vcsLogin;
              }
              $_SESSION['project'] = $this->project;
              $_SESSION['vcsPasswd'] = $this->vcsPasswd;
              $_SESSION['isAnonymous'] = $this->isAnonymous;
              $_SESSION['anonymousIdent'] = $this->anonymousIdent;
              $_SESSION['email']      = $this->email;
              $_SESSION['lang']      = $this->vcsLang;
              $_SESSION['userConf']  = $this->defaultConf;

              // We construct the return's var for ExtJs
              $return['state'] = true;
              
           }

           // We put this username into a cookie after a valid login
           if( $this->isAnonymous ) {
           	$cookieLogin = 'anonymous';
           } else {
            $cookieLogin = $_SESSION['vcsLogin'];
           }
           
           setcookie("loginApp", $cookieLogin, time() + 3600*24*365, "/"); // One year ;)
           setcookie("email", $email, time() + 3600*24*365, "/");

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
     * Check if a user is an anonymous or not based only on his name.
     * @param string The user name to check
     * @return boolean TRUE if the given user is an anonymous, FALSE otherwise.
     */
    public function anonymous($userName)
    {
    	return ( substr(strtolower($userName), 0, 11) === 'anonymous #' ) ? true : false;
    }

    public function isAdmin()
    {
    	$admin = explode(",", $this->appConf[$this->project]['project.admin']);
    	return ( in_array($this->vcsLogin, $admin) ) ? true : false;
    }
    
    public function updateEmail()
    {
        $db = DBConnection::getInstance();
        
        $s = sprintf(
            'UPDATE `users` SET `email`="%s" WHERE `userID`="%s"',
            $this->email, $this->userID
        );
        $db->query($s);
    }
    

    /**
     * Get the email for a user
     *
     * @return The email or false if we haven't found it.
     */
    public function getUserEmail($user)
    {
        $am      = AccountManager::getInstance();
        $project = $am->project;

        $s = sprintf(
            'SELECT
                `email`
             FROM
                `users`
             WHERE
                `project`   = "%s" AND
                `vcs_login` = "%s"',
            $project, $user
        );
        $r = DBConnection::getInstance()->query($s);
        $nb = $r->num_rows;

        // We have found an email
        if( $nb != 0 ) {
            $a = $r->fetch_object();
            return $a->email;
        } else {
            return false;
        }

    }
    
    /**
     * Register a new valid user on the application.
     *
     * @return int The database insert id
     */
    private function register()
    {
        $db = DBConnection::getInstance();

        $s = sprintf(
            'INSERT INTO `users` (`project`, `vcs_login`, `email`, `anonymousIdent`, `conf`) VALUES ("%s","%s","%s","%s","%s")',
            $this->project, $this->vcsLogin, $this->email, $this->anonymousIdent, $db->real_escape_string(json_encode($this->defaultConf))
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
    public function updateConf($module, $itemName, $value)
    {
        if( $value == "false" ) {
            $value = false;
        }

        if( $value == "true" ) {
            $value = true;
        }
        unset($this->userConf->{$module}->{$itemName});
        $this->userConf->{$module}->{$itemName} = ( is_numeric($value) ) ? (int) $value : $value;
        
        // In session
        unset($_SESSION['userConf']->{$module}->{$itemName});
        $_SESSION['userConf']->{$module}->{$itemName} = ( is_numeric($value) ) ? (int) $value : $value;
        
        $db = DBConnection::getInstance();

        // In DB
        if( $this->isAnonymous ) {
            $s = sprintf(
                'UPDATE `users` SET `conf`="%s" WHERE `vcs_login`="%s" AND `anonymousIdent`="%s"',
                $db->real_escape_string(json_encode($this->userConf)), "anonymous", $this->anonymousIdent
            );
        } else {
            $s = sprintf(
                'UPDATE `users` SET `conf`="%s" WHERE `vcs_login`="%s"',
                $db->real_escape_string(json_encode($this->userConf)), $this->vcsLogin
            );
        }
        $db->query($s);
    }

    /**
     * Erase personal data for the current user.
     * Delete all reference from `users` & `commitMessage` DB tables.
     */
    public function eraseData()
    {
        $db = DBConnection::getInstance();

        $s = sprintf(
            'DELETE FROM `commitMessage` WHERE `user`="%s"',
            $this->vcsLogin
        );
        $db->query($s);

        $s = sprintf(
            'DELETE FROM `users` WHERE `userID`="%s"',
            $this->userID
        );
        $db->query($s);
    }

    /**
     * Send an email
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
                   'X-Mailer: Php Docbook Online Editor' ."\r\n" .
                   'Content-Type: text/plain; charset="utf-8"'."\n";

        mail($to, stripslashes($subject), stripslashes(trim($msg)), $headers);
    }
}

?>
