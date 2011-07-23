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
    private $conn;

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
    public $authService;
    public $authServiceID;

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
                'theme' => 'themes/empty.css',
                'portalSortEN'=> '{"col1":["portletLocalMail","portletBugs"],"col2":["portletInfo","portletTranslationsGraph"]}',
                'portalSortLANG'=> '{"col1":["portletSummary","portletTranslator","portletLocalMail","portletBugs"],"col2":["portletInfo","portletTranslationGraph","portletTranslationsGraph"]}',
                'displayENWork'=>true
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
                'googlePanelDisplay' => false,
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

        $this->conn = DBConnection::getInstance();
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
        $s = 'UPDATE `users` SET `last_connect`=now() WHERE `userID`=%d';
        $params = array($this->userID);
        $this->conn->query($s, $params);
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
        
        $this->authService = ( isset($_SESSION['authService']) ) ? $_SESSION['authService'] : false;
        $this->authServiceID = ( isset($_SESSION['authServiceID']) ) ? $_SESSION['authServiceID'] : false;

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
    public function login($project, $vcsLogin, $vcsPasswd, $email, $lang='en', $authService='VCS', $authServiceID)
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

        $this->authService = $authService;
        $this->authServiceID = $authServiceID;
        
        /*
        *           VCS AUTH SYSTEM
        *
        */
        
        if( $this->authService == 'VCS' ) {
        
            /*
            *           ANONYMOUS VCS
            *
            */
        
            // Anonymous's user can logging into this app by providing this login/pass => anonymous/(empty) ou (empty)/(empty)
            // The result is the same. $this->vcsLogin will be "anonymous" and $this->vcsPasswd, (empty)
            if( ($vcsLogin == "anonymous" && $vcsPasswd == "")
             || ($vcsLogin == ""          && $vcsPasswd == "") ) {
               
               $this->isAnonymous = true;

               // Even if the user provide an empty login, we force it to be 'anonymous'
               $vcsLogin  = 'anonymous';
        
               $this->anonymousIdent = ( isset($_COOKIE['anonymousIdent']) ) ? $_COOKIE['anonymousIdent'] : uniqid('', true);
               
               setcookie("anonymousIdent", $this->anonymousIdent, time() + 3600*24*365, "/"); // One year ;)
               
                // Register var
                $this->vcsLogin  = $vcsLogin;
                $this->vcsPasswd = '';
                $this->vcsLang   = $lang;
                $this->email     = $email;
                
                // Check DB
                $s = 'SELECT * FROM `users` WHERE `project` = "%s" AND `authService` = "VCS" AND `vcs_login` = "%s" AND `anonymousIdent` = "%s"';
                $params = array($project, $this->vcsLogin, $this->anonymousIdent);
       
                $r = $this->conn->query($s, $params);

        
                if ($r->num_rows == 1) {
                
                  //This anonymous user exist into DB. We store his configuration into ...
                  $a = $r->fetch_object();

                  // ... object's property ...
                  $this->userConf = json_decode($a->conf);
                  
                  $this->userID = $a->userID;

                  // ... and into the php's session (only specific var)
                  $_SESSION['userConf']  = $this->userConf;
                  
                  // We update the email if this user have decided to change it.
                  $this->updateEmail();
                  
                } else {
                
                    // We register this new valid user
                    $userID = $this->register();
                    $this->userID = $userID;
                
                    // Store in session only specific var
                    $_SESSION['userConf'] = $this->defaultConf;
                
                }
                
                // Generic session var for VALID & ANONYMOUS VCS user
                $_SESSION['userID']  = $this->userID;
                $_SESSION['project'] = $this->project;
                $_SESSION['vcsLogin'] = $this->vcsLogin = $this->vcsLogin.' #'.$this->userID;
                $_SESSION['vcsPasswd'] = $this->vcsPasswd;
                $_SESSION['isAnonymous'] = $this->isAnonymous;
                $_SESSION['anonymousIdent'] = $this->anonymousIdent;
                $_SESSION['lang']      = $this->vcsLang;
                $_SESSION['email']  = $this->email;
                $_SESSION['authService']  = $this->authService;
                $_SESSION['authServiceID']  = $this->authServiceID;
                
                // We set up the CSRF token
                $_SESSION['csrfToken'] = sha1(uniqid(rand(), true));
                
                // Store some user info in cookies: we can use this to pre-fill the
                // login page if the user's session expires.
                setcookie("loginApp", 'anonymous', time() + 3600*24*365, "/"); // One year ;)
                setcookie("email", $this->email, time() + 3600*24*365, "/");
                setcookie("lang", $this->vcsLang, time() + 3600*24*365, "/");
            
                    
                // We construct the return's var for ExtJs
                $return['state'] = true;
                $return['msg']   = 'Welcome !';
                return $return;
                
            }
            
            /*
            *           VALID VCS USER
            *
            */
        
            
            else {
            
                $this->isAnonymous = false;
                $this->anonymousIdent = '';
                
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
                
                
                if( $AuthReturn !== true ) {
                    $return['state'] = false;
                    $return['msg']   = $AuthReturn;
                    return $return;
                } else {
                
                    // Check the karma
                    $karma = VCSFactory::getInstance()->checkKarma($vcsLogin, $lang);
                    
                    if( $karma !== true ) {
                        $return['state'] = false;
                        $return['msg']   = $karma;
                        return $return;
                    }
                    
                    // Register var
                    $this->vcsLogin  = $vcsLogin;
                    $this->vcsPasswd = $vcsPasswd;
                    $this->vcsLang   = $lang;
                    $this->email     = $email;
                    
                    // Check DB
                    $s = 'SELECT * FROM `users` WHERE `project` = "%s" AND `authService` = "VCS" AND `vcs_login` = "%s"';
                    $params = array($project, $this->vcsLogin);
           
                    $r = $this->conn->query($s, $params);

                    if ($r->num_rows == 1) {
                    
                      //This user exist into DB. We store his configuration into ...
                      $a = $r->fetch_object();

                      // ... object's property ...
                      $this->userConf = json_decode($a->conf);
                      
                      $this->userID = $a->userID;

                      // ... and into the php's session (only specific var)
                      $_SESSION['userConf']  = $this->userConf;
                      
                      // We update the email if this user have decided to change it.
                      $this->updateEmail();
                      
                    } else {
                    
                        // We register this new valid user
                        $userID = $this->register();
                        $this->userID = $userID;
                        
                        // Store in session only specific var
                        $_SESSION['userConf']  = $this->defaultConf;
                    
                    }
                    
                    // Generic session var for VALID & ANONYMOUS VCS user
                    $_SESSION['userID']  = $this->userID;
                    $_SESSION['project'] = $this->project;
                    $_SESSION['vcsLogin'] = $this->vcsLogin;
                    $_SESSION['vcsPasswd'] = $this->vcsPasswd;
                    $_SESSION['isAnonymous'] = $this->isAnonymous;
                    $_SESSION['anonymousIdent'] = $this->anonymousIdent;
                    $_SESSION['lang']      = $this->vcsLang;
                    $_SESSION['email']  = $this->email;
                    $_SESSION['authService']  = $this->authService;
                    $_SESSION['authServiceID']  = $this->authServiceID;
                    
                    // We set up the CSRF token
                    $_SESSION['csrfToken'] = sha1(uniqid(rand(), true));
                    
                    // Store some user info in cookies: we can use this to pre-fill the
                    // login page if the user's session expires.
                    setcookie("loginApp", utf8_encode($this->vcsLogin), time() + 3600*24*365, "/"); // One year ;)
                    setcookie("email", $this->email, time() + 3600*24*365, "/");
                    setcookie("lang", $this->vcsLang, time() + 3600*24*365, "/");
                
                        
                    // We construct the return's var for ExtJs
                    $return['state'] = true;
                    $return['msg']   = 'Welcome !';
                    return $return;
                }
            
            }
        
        }
        
        /*
        *           EXTERNAL AUTH SYSTEM
        *
        */
        
        else if( $this->authService == 'google' || $this->authService == 'facebook' ) {
        
            $this->isAnonymous = true;
            $this->anonymousIdent = $this->authService.'-'.$this->authServiceID;
            
            // Register var
            $this->vcsLogin  = $vcsLogin;
            $this->vcsPasswd = '';
            $this->vcsLang   = $lang;
            $this->email     = $email;
        
            // Check DB
            $s = 'SELECT * FROM `users` WHERE `project` = "%s" AND `authService` = "%s" AND `authServiceID` = "%s" AND `vcs_login` = "%s" AND `anonymousIdent` = "%s"';
            $params = array($project, $this->authService, $this->authServiceID, $this->vcsLogin, $this->anonymousIdent);
            
            $r = $this->conn->query($s, $params);
            
            if ($r->num_rows == 1) {
                //This anonymous user exist into DB. We store his configuration into ...
                $a = $r->fetch_object();
                
                // ... object's property ...
                $this->userConf = json_decode($a->conf);
                
                $this->userID = $a->userID;
                
                // ... and into the php's session (only specific var)
                $_SESSION['userConf']  = $this->userConf;
                
                // We update the email if this user have decided to change it.
                $this->updateEmail();
            
            } else {
            
                // We register this new valid user
                $userID = $this->register();
                $this->userID = $userID;
                
                // Store in session only specific var
                $_SESSION['userConf'] = $this->defaultConf;
                
            }
            
            // Generic session var for VALID & ANONYMOUS VCS user
            $_SESSION['userID']  = $this->userID;
            $_SESSION['project'] = $this->project;
            $_SESSION['vcsLogin'] = $this->vcsLogin;
            $_SESSION['vcsPasswd'] = $this->vcsPasswd;
            $_SESSION['isAnonymous'] = $this->isAnonymous;
            $_SESSION['anonymousIdent'] = $this->anonymousIdent;
            $_SESSION['lang']      = $this->vcsLang;
            $_SESSION['email']  = $this->email;
            $_SESSION['authService']  = $this->authService;
            $_SESSION['authServiceID']  = $this->authServiceID;
                
            // We set up the CSRF token
            $_SESSION['csrfToken'] = sha1(uniqid(rand(), true));
            
            // Store some user info in cookies: we can use this to pre-fill the
            // login page if the user's session expires.
            setcookie("loginApp", utf8_encode($this->vcsLogin), time() + 3600*24*365, "/"); // One year ;)
            setcookie("email", $this->email, time() + 3600*24*365, "/");
            setcookie("lang", $this->vcsLang, time() + 3600*24*365, "/");
            
            // We construct the return's var for ExtJs
            $return['state'] = true;
            $return['msg']   = 'Welcome !';
            return $return;
        
        } else {
            $return['state'] = false;
            $return['msg']   = 'Bad authService';
            $return['authMethod'] = '-';
            return $return;
        }
        
    }

    /**
     * Check if a user is an anonymous or not based only on his name.
     * @param string The user name to check
     * @return boolean TRUE if the given user is an anonymous, FALSE otherwise.
     */
    public function anonymous($userLogin, $anonymousIdent)
    {
        // A valid user is a user who have a "VCS" authService, without anonymousIdent
        $s = 'SELECT authService, anonymousIdent FROM `users` WHERE project="%s" AND vcs_login = "%s" AND anonymousIdent = "%s"';
        
        $params = array($this->project, $userLogin, $anonymousIdent);
        $r = $this->conn->query($s, $params);
        $a = $r->fetch_object();
        
        // An anonymous have is #xxx at the end of his login. So, the sql "failed"
        if( !is_object($a) ) {
            return true;
        }

        return ( $a->authService == 'VCS' && $a->anonymousIdent == '' ) ? false : true;
    }

    public function isGlobalAdmin()
    {
        // Anonymous can't be a globalAdmin
        if( $this->isAnonymous ) return false;
    
    	$admin = explode(",", $this->appConf[$this->project]['project.globaladmin']);
    	return ( in_array($this->vcsLogin, $admin) ) ? true : false;
    }

    public function isLangAdmin()
    {
        // Anonymous can't be a langAdmin
        if( $this->isAnonymous ) return false;
        
        if( !isset($this->appConf[$this->project]['project.langadmin.'.$this->vcsLang]) ) {
            return false;
        }
        
        $admin = explode(",", $this->appConf[$this->project]['project.langadmin.'.$this->vcsLang]);
        return ( in_array($this->vcsLogin, $admin) ) ? true : false;
    }
    
    public function isAdmin($lang=false)
    {
        if( $this->isAnonymous ) return false;
        
        // If lang is true, this method must return true if current user is either a global admin, or a lang admin
        if( $lang ) {
            return ( $this->isGlobalAdmin() || $this->isLangAdmin() ) ? true : false;
        } else {
            // If lang is false, this method must return true if current user is ONLY a global admin
            return ( $this->isGlobalAdmin() ) ? true : false;
        }
        
        return false;
    }
    
    public function updateEmail()
    {
        $s = 'UPDATE `users` SET `email`="%s" WHERE `userID`=%d';
        $params = array($this->email, $this->userID);
        $this->conn->query($s, $params);
    }
    
    public function getVCSUsers()
    {
        $s = 'SELECT `userID`, `vcs_login`, `anonymousIdent`, `authService` FROM `users` WHERE project="%s" AND vcs_login != "anonymous" ORDER BY authService, vcs_login';
        $params = array($this->project);
        $r = $this->conn->query($s, $params);
        
        $result = array();
        $i=0;
        
        while( $a = $r->fetch_object() ) {
            $result[$i]['userID'] = $a->userID;
            $result[$i]['userName'] = $a->vcs_login;
            $result[$i]['authService'] = $a->authService;
            $i++;
        }
        return $result;
    }
    
    public function setFileOwner($fileIdDB, $newOwnerID)
    {
        // Get newUser information
        $s = 'SELECT * FROM `users` WHERE `userID` = %d';
        $params = array($newOwnerID);

        $r = $this->conn->query($s, $params);
        $userInfo = $r->fetch_object();
        
        // We update the file
        $s = 'UPDATE `work` SET `user` = "%s", `anonymousIdent` = "%s" WHERE `id` = %d';
        $params = array($userInfo->vcs_login, $userInfo->anonymousIdent, $fileIdDB);

        $this->conn->query($s, $params);
    }
    

    /**
     * Get the email for a user
     *
     * @return The email or false if we haven't found it.
     */
    public function getUserEmail($user, $anonymousIdent)
    {
        $am      = AccountManager::getInstance();
        $project = $am->project;

        $s = 'SELECT `email` FROM `users` WHERE `project` = "%s" AND `vcs_login` = "%s" AND `anonymousIdent` = "%s"';
        $params = array($project, $user, $anonymousIdent);

        $r = $this->conn->query($s, $params);
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
        $s = 'INSERT INTO `users` (`project`, `authService`, `authServiceID`, `vcs_login`, `email`, `anonymousIdent`, `conf`) VALUES ("%s","%s","%s","%s","%s","%s","%s")';
        $params = array($this->project, $this->authService, $this->authServiceID, $this->vcsLogin, $this->email, $this->anonymousIdent, json_encode($this->defaultConf));

        $this->conn->query($s, $params);
        return $this->conn->insert_id();
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

        // @todo determine why this is called when these are empty
        if (empty($module) || empty($itemName)) {
            return false;
        }

        $this->userConf->{$module}->{$itemName} = ( is_numeric($value) ) ? (int) $value : $value;
        
        // In session
        unset($_SESSION['userConf']->{$module}->{$itemName});
        $_SESSION['userConf']->{$module}->{$itemName} = ( is_numeric($value) ) ? (int) $value : $value;
        
        // In DB
        if( $this->isAnonymous ) {
            $s = 'UPDATE `users` SET `conf`="%s" WHERE `vcs_login`="anonymous" AND `anonymousIdent`="%s"';
            $params = array(json_encode($this->userConf), $this->anonymousIdent);
        } else {
            $s = 'UPDATE `users` SET `conf`="%s" WHERE `vcs_login`="%s"';
            $params = array(json_encode($this->userConf), $this->vcsLogin);
        }
        $this->conn->query($s, $params);
    }

    /**
     * Erase personal data for the current user.
     * Delete all reference from `users` & `commitMessage` DB tables.
     */
    public function eraseData()
    {
        $s = 'DELETE FROM `commitMessage` WHERE `user`="%s"';
        $params = array($this->vcsLogin);
        $this->conn->query($s, $params);

        $s = 'DELETE FROM `users` WHERE `userID`=%d';
        $params = array($this->userID);
        $this->conn->query($s, $params);
    }

    /**
     * Send an email
     *
     * @param $to The Receiver.
     * @param $subject The subject of the email.
     * @param $msg The content of the email. Don't use HTML here ; only plain text.
     * @param $from The email we place into From header.
     * @param $fromType Either "user" or "list". Default to user
     */
    public function email($to, $subject, $msg, $from='', $fromType='user')
    {
        if( $fromType == 'user' ) {
            $from = $this->vcsLogin."@php.net";
        }

        $headers = 'From: '.$from . "\r\n" .
                   'X-Mailer: Php Docbook Online Editor' ."\r\n" .
                   'Content-Type: text/plain; charset="utf-8"'."\n";

        mail($to, stripslashes($subject), stripslashes(trim($msg)), $headers, "-fnoreply@php.net");
    }
}

?>
