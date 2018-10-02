<?php
/**
 * Ext JS controller class definition file
 *
 * @todo Add inline documentation for each controller task
 */

require_once dirname(__FILE__) . '/AccountManager.php';
require_once dirname(__FILE__) . '/BugReader.php';
require_once dirname(__FILE__) . '/DictionaryManager.php';
require_once dirname(__FILE__) . '/EntitiesAcronymsFetcher.php';
require_once dirname(__FILE__) . '/File.php';
require_once dirname(__FILE__) . '/MicrosoftTranslator.class.php';
require_once dirname(__FILE__) . '/JsonResponseBuilder.php';
require_once dirname(__FILE__) . '/LogManager.php';
require_once dirname(__FILE__) . '/LockFile.php';
require_once dirname(__FILE__) . '/NewsReader.php';
require_once dirname(__FILE__) . '/PreviewFile.php';
require_once dirname(__FILE__) . '/ProjectManager.php';
require_once dirname(__FILE__) . '/RepositoryFetcher.php';
require_once dirname(__FILE__) . '/RepositoryManager.php';
require_once dirname(__FILE__) . '/ToolsXmllint.php';
require_once dirname(__FILE__) . '/TranslationStatistic.php';
require_once dirname(__FILE__) . '/TranslatorStatistic.php';
require_once dirname(__FILE__) . '/UserNotes.php';
require_once dirname(__FILE__) . '/VCSFactory.php';

/**
 * Ext JS controller class
 */
class ExtJsController
{
    /**
     * Array of request variables
     *
     * @var array
     */
    private $requestVariables = array();

    /**
     * Initializes the controller
     *
     * @param array $request An associative array of request variables
     */
    public function __construct($request)
    {
        $this->requestVariables = $request;
    }

    /**
     * Gets the specified request variable
     *
     * @param string $name The variable name
     * @return mixed The variable value on success, FALSE is the variable was not set
     */
    public function getRequestVariable($name)
    {
        return $this->hasRequestVariable($name)
                ? $this->requestVariables[$name]
                : false;
    }

    /**
     * Tells if the specified request variable exist
     *
     * @param string $name The variable name
     * @return mixed Returns TRUE if the variable exists, FALSE otherwise
     */
    public function hasRequestVariable($name)
    {
        return isset($this->requestVariables[$name]);
    }

    /**
     * Login to the tool
     *
     * @return The Success response on success, or a Failure
     */
    public function login()
    {
        $am = AccountManager::getInstance();

        $vcsLogin  = $this->getRequestVariable('vcsLogin');
        $vcsPasswd = $this->getRequestVariable('vcsPassword');
        $lang      = $this->getRequestVariable('lang');
        $project   = $this->getRequestVariable('project');
        $email   = $this->getRequestVariable('email');
        $authService   = $this->getRequestVariable('authService');
        $authServiceID   = $this->getRequestVariable('authServiceID');

        $response = $am->login($project, $vcsLogin, $vcsPasswd, $email, $lang, $authService, $authServiceID);

        if ($response['state'] === true) {
            // This user is already know as a valid user

            // We stock this info into DB
            $value = array();
            $value['user'] = $am->vcsLogin;
            $value['lang'] = $lang;
            $value['authService'] = $am->authService;

            RepositoryManager::getInstance()->setStaticValue('info', 'login', json_encode($value), true);

            return JsonResponseBuilder::success();

        } elseif ($response['state'] === false) {

            // This user is unknow from this server
            return JsonResponseBuilder::failure(array(
              'msg'        => $response['msg'],
              'authMethod' => $response['authMethod']
            ));

        } else {
            return JsonResponseBuilder::failure();
        }
    }

    /**
     * Update the repository
     */
    public function updateRepository()
    {
        $am = AccountManager::getInstance();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        if ( !$am->isGlobalAdmin() ) {
            return JsonResponseBuilder::failure(
                array(
                    'type' => 'action_only_global_admin'
                )
            );
        }

        RepositoryManager::getInstance()->updateRepository();
        return JsonResponseBuilder::success();
    }

    /**
     * Add a new folder
     *
     */
    public function addNewFolder()
    {
        $am = AccountManager::getInstance();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        if ( !$am->isGlobalAdmin() && !$am->isLangAdmin() ) {
            return JsonResponseBuilder::failure();
        }

        $project = $am->project;
        $appConf = $am->appConf;

        $parentFolder  = $this->getRequestVariable('parentFolder');
        $newFolderName = $this->getRequestVariable('newFolderName');

        if( strlen($newFolderName) < 1 ) return JsonResponseBuilder::failure();

        // Don't allow to add a new folder into root system
        if( $parentFolder == "/" ) {
            return JsonResponseBuilder::failure();
        }

        $t = explode("/", $parentFolder);
        $fileLang = $t[1];
        array_shift($t); // skip the first witch is empty
        array_shift($t); // skip the second witch is the lang

        $filePath = "/".implode("/", $t).$newFolderName;

        $file = new File($fileLang, $filePath);

        // We test if this folder not already exist
        if( $file->exist() )
        {
            return JsonResponseBuilder::failure(
                array(
                    'type' => 'folder_already_exist'
                )
            );
        }

        if( $file->createFolder() ) {
            return JsonResponseBuilder::success();
        } else {
            return JsonResponseBuilder::failure();
        }

    }


    /**
     * Check if a lock file exist or not
     */
    public function checkLockFile()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $lockFile  = $this->getRequestVariable('lockFile');
        $lockFiles = $this->getRequestVariable('lockFiles');

        if( $lockFile )
        {
            $lock = new LockFile($lockFile);

            return $lock->isLocked()
                ? JsonResponseBuilder::success()
                : JsonResponseBuilder::failure();
        }

        if( $lockFiles )
        {
            $ok = false;
            $files = explode("|", $lockFiles);

            foreach ($files as $i => $file)
            {
                $lock = new LockFile($file);
                if( $lock->isLocked() )
                {
                    $ok = true;
                }
            }
            if( $ok )
            {
                return JsonResponseBuilder::success();
            } else {
                return JsonResponseBuilder::failure();
            }
        }
    }

    /**
     * switch to a specific language
     */
    public function switchLang()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $lang = $this->getRequestVariable('lang');

        AccountManager::getInstance()->switchLang($lang);

        return JsonResponseBuilder::success();

    }

    /**
     * Get all available project
     */
    public function getAvailableProject()
    {
        $r = ProjectManager::getInstance()->getAvailableProject();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );

    }
    /**
     * Get all available language
     */
    public function getAvailableLanguage()
    {
        $r = RepositoryManager::getInstance()->getAvailableLanguage();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );

    }

    public function getSkeletonsNames()
    {
        $am = AccountManager::getInstance();
        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $rf = RepositoryFetcher::getInstance();

        $return[] = Array("name"=> "Empty file", "path"=> "-");


        // Get skeletons info
        $skeletons = $rf->getSkeletonsNames();

        $return = array_merge($return, $skeletons);

        return JsonResponseBuilder::success(
            array(
                'Items' => $return
            )
        );
    }

    /**
     * Apply all tools on the documentation
     */
    public function applyTools()
    {
        $am = AccountManager::getInstance();
        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        if ( !$am->isGlobalAdmin() ) {
            return JsonResponseBuilder::failure(
                array(
                    'type' => 'action_only_global_admin'
                )
            );
        }

        $rm = RepositoryManager::getInstance();

        $project = $am->project;
        $vcsLogin = $am->vcsLogin;
        $vcsLang = $am->vcsLang;

        $rm->cleanUp();

        // Set the lock File
        $lock = new LockFile('project_'.$project.'_lock_apply_tools');

        if ($lock->lock()) {

            // Start Revcheck
            $rm->applyRevCheck();

            // Search for NotInEN Old Files
            $rm->updateNotInEN();

            // Parse translators
            $rm->updateTranslatorInfo();

            // We re-compute statistics
            TranslationStatistic::getInstance()->computeSummary('all');
            TranslatorStatistic::getInstance()->computeSummary('all');

            // Store this info
            $info = array();
            $info['user']   = $vcsLogin;

            $rm->setStaticValue('info', 'updateData', json_encode($info), true);
        }
        $lock->release();

        return JsonResponseBuilder::success();
    }

    /**
     * Pings the server and user session
     *
     * @return string "pong" & others informations on success, "false" on failure
     */
    public function ping()
    {
        $am = AccountManager::getInstance();

        if( ! $am->isLogged() ) {
            return JsonResponseBuilder::failure();
        }

        $rf = RepositoryFetcher::getInstance();

        $lang = $am->vcsLang;

        if( $lang != 'en' ) {
            $data['NbPendingTranslate'] = (int)$rf->getNbPendingTranslate();
            $data['NbPendingUpdate']    = (int)$rf->getNbPendingUpdate();

            $errorTools = new ToolsError();
            $errorTools->setParams('', '', $am->vcsLang, '', '', '');
            $t = $errorTools->getFilesError($rf->getModifies());
            $data['NbFilesError'] = (int)$t['nb'];

            $data['NbPendingReview'] = (int)$rf->getNbPendingReview();
            $data['NbNotInEn']       = (int)$rf->getNbNotInEn();
        }

        // TODO : find a way to detect modification into Work & patches modules
        //$data['NbPendingCommit'] = $rf->getNbPendingCommit();
        //$data['NbPendingPatch']  = $rf->getNbPendingPatch();

        $data['topicInfo'] = $rf->getStaticValue('main_topic', '');

        $data['lastInfoDate'] = $rf->getLastInfoDate();

        // We get the update_data lock file
        $lockFile = new LockFile('project_' . $am->project . '_lock_update_data');

        if( $lockFile->isLocked() ) {
            $updateData = $lockFile->readLock();
        } else {
            $updateData = false;
        }



        $response = !isset($_SESSION['userID']) ? 'false' : 'pong';

        return JsonResponseBuilder::success(
            array(
                'ping'      => $response,
                'updateData'=> $updateData,
                'totalData' => $data
            )
        );
    }

    /**
     * Get all files witch need to be updated
     */
    public function getFilesNeedUpdate()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $r = RepositoryFetcher::getInstance()->getPendingUpdate();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get all files witch need to be translated from scratch
     */
    public function getFilesNeedTranslate()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $r = RepositoryFetcher::getInstance()->getPendingTranslate();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get all files who are not in the EN tree
     */
    public function getFilesNotInEn()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $r = RepositoryFetcher::getInstance()->getNotInEn();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get all files witch need to be reviewed
     */
    public function getFilesNeedReviewed()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $r = RepositoryFetcher::getInstance()->getPendingReview();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get all files from witch an error have been detected
     */
    public function getFilesError()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $errorTools = new ToolsError();
        $errorTools->setParams('', '', AccountManager::getInstance()->vcsLang, '', '', '');
        $r = $errorTools->getFilesError(RepositoryFetcher::getInstance()->getModifies());

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get all files in work module
     */
    public function getWork()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $module = $this->getRequestVariable('module');

        $r = RepositoryFetcher::getInstance()->getWork($module);

        return $r;
    }

    /**
     * Get all patch created by users
     */
    public function getFilesPendingPatch()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $r = RepositoryFetcher::getInstance()->getPendingPatch();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get some statistics from translators
     */
    public function getTranslatorInfo()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $allTranslators = RepositoryFetcher::getInstance()->getStaticValue('translator_summary', AccountManager::getInstance()->vcsLang);

        //var_dump($allTranslators);

        // We don't display translator who haven't any files
        $translators = array();
        for( $i=0; $i < count($allTranslators); $i++ )
        {
            if( $allTranslators[$i]->sum > 0 )
            {
                $translators[] = $allTranslators[$i];
            }
        }

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($translators),
                'Items'   => $translators
            )
        );
    }

    /**
     * Get some statistics from reviewers
     */
    public function getReviewerInfo()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $allTranslators = RepositoryFetcher::getInstance()->getStaticValue('translator_summary', AccountManager::getInstance()->vcsLang);

        // We don't display translator who haven't any reviewed files
        $translators = array();
        for( $i=0; $i < count($allTranslators); $i++ )
        {
            if( $allTranslators[$i]->reviewedSum > 0 )
            {
                $translators[] = $allTranslators[$i];
            }
        }

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($translators),
                'Items'   => $translators
            )
        );
    }

    /**
     * Get informations about apps
     */
    public function getInfos()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $start = $this->getRequestVariable('start');
        $limit = $this->getRequestVariable('limit');

        $infos = RepositoryFetcher::getInstance()->getInfos($start, $limit);

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $infos['total'],
                'Items'   => $infos['value']
            )
        );
    }

    /**
     * Get Usage informations about apps
     */
    public function getUsageInfos()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $year = $this->getRequestVariable('year');
        $infos = RepositoryFetcher::getInstance()->getUsageInfos($year);

        return JsonResponseBuilder::success(
            array(
                'Items'   => $infos
            )
        );
    }

    /**
     * Get some generals statistics
     */
    public function getSummaryInfo()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $summary = RepositoryFetcher::getInstance()->getStaticValue('translation_summary', AccountManager::getInstance()->vcsLang);

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($summary),
                'Items'   => $summary
            )
        );
    }

    /**
     * Get lasts news from the LANG mailing list
     */
    public function getLastNews()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $nr = new NewsReader(AccountManager::getInstance()->vcsLang);
        $r  = $nr->getLastNews();

        if( !$r ) {
            return JsonResponseBuilder::failure();
        } else {
            return JsonResponseBuilder::success(
                array(
                    'nbItems' => count($r),
                    'Items'   => $r
                )
            );
        }

    }

    /**
     * Get all open bugs from php's bugtracker. The title of the bug need to be prefixed by [LANG] to be found.
     */
    public function getOpenBugs()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $bugs = new BugReader(AccountManager::getInstance()->vcsLang);
        $r = $bugs->getOpenBugs();

        if( $r === false ) {
            return JsonResponseBuilder::failure();
        } else {
            return JsonResponseBuilder::success(
                array(
                    'nbItems' => count($r),
                    'Items'   => $r
                )
            );
        }
    }

    /**
     * Get the translation from a given string using Google Translate API
     */
    public function getGGTranslation()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $str = $this->getRequestVariable('str');

        $lang = AccountManager::getInstance()->vcsLang;

        $translation = false;

        $str = str_replace("\n", "[@]", $str);

        $gt = new Gtranslate;
        $gt->setRequestType('curl');
        $translation = $gt->translate('en', $lang, $str);

        // Replace new line mark
        $translation = str_replace("[@]", "<br>", $translation);

        // Few substitutions
        $translation = str_replace("&amp;" , "&", $translation);
        $translation = str_replace("&amp;  ", "&", $translation);
        $translation = str_replace("&#39;" , "'", $translation);
        $translation = str_replace("&quot;", '"', $translation);
        $translation = str_replace("&lt;"  , '<', $translation);
        $translation = str_replace("&gt;"  , '>', $translation);

        return JsonResponseBuilder::success(
            array(
                'translation' => $translation
            )
         );

    }

    /**
     * Get the translation from a given string using Bing Translate API
     */
    public function getBingTranslation()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $str = $this->getRequestVariable('str');

        $lang = AccountManager::getInstance()->vcsLang;

        $translation = false;

        $str = str_replace("\n", "[@]", $str);

        $bing = new MicrosoftTranslator("0Iwzej5BJeHK/2nvHh7/uJyHLhmnyFJEAuOYOfJ1QLg=");

        $bing->translate('en', $lang, $str);

        $bing->response->jsonResponse;

        preg_match("/<string xmlns=\"(.[^\"]*)\">(.*)?<\/string>/e", $bing->response->translation, $match);

        // Replace new line mark
        $translation = str_replace("[@]", "<br>", $match[2]);

        // Few substitutions
        $translation = str_replace("&amp;" , "&", $translation);
        $translation = str_replace("&amp;  ", "&", $translation);
        $translation = str_replace("&#39;" , "'", $translation);
        $translation = str_replace("&quot;", '"', $translation);
        $translation = str_replace("&lt;"  , '<', $translation);
        $translation = str_replace("&gt;"  , '>', $translation);

        return JsonResponseBuilder::success(
            array(
                'translation' => $translation
            )
         );

    }

    /**
     * Get the URL to the orignal page from the PHP Manual
     */
    public function getURLToOriginalManualPage()
    {
        $am = AccountManager::getInstance();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $fileFullPath = $this->getRequestVariable('fileFullPath');

        $t = explode("/", $fileFullPath);
        $FileLang = array_shift($t);
        $FilePath = implode('/', $t);

        $file = new File($FileLang, $FilePath);
        $info = $file->getInfo();

        // Extract xmlId and take the first one
        $xmlID = '';
        $tmp = explode('|', $info['xmlid']);
        $xmlID = $tmp[0];

        // Build the URL for the original Documentation
        $url = 'http://php.net/manual/'.$FileLang.'/'.$xmlID.'.php';

        if( trim($xmlID) == '' || $FileLang == 'doc-base' ) {
            $url = '404';
        }

        return JsonResponseBuilder::success(
            array(
                'url' => $url
            )
        );

    }

    /**
     * Get information of a file by his xmlID
     */
    public function getFileInfoByXmlID()
    {
        $am = AccountManager::getInstance();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }
        $lang = $am->vcsLang;

        $xmlID = $this->getRequestVariable('xmlID');

        $r = RepositoryFetcher::getInstance()->getFileByXmlID($lang, $xmlID);

        if (false == is_null($r)) {
            return JsonResponseBuilder::success(
                array(
                    'lang' => $lang,
                    'path' => $r->path,
                    'name' => $r->name
                )
            );
        } else {
            return JsonResponseBuilder::failure();
        }

    }


    /**
     * Get the content of a file
     */
    public function getFile()
    {
        $am = AccountManager::getInstance();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $appConf = $am->appConf;
        $project = $am->project;

        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');

        $readOriginal = $this->hasRequestVariable('readOriginal')
                        ? $this->getRequestVariable('readOriginal')
                        : false;

        $ggTranslate  = $this->hasRequestVariable('ggTranslate')
                        ? $this->getRequestVariable('ggTranslate')
                        : false;

        $skeleton = $this->getRequestVariable('skeleton');

        // ExtJs pass false as a string ; fix it
        if( $readOriginal == "false" ) $readOriginal = false;
        if( $ggTranslate  == "false" ) $ggTranslate  = false;
        if( $skeleton     == "false" ) $skeleton     = false;

        // Handle if we want to load a skeleton when we create a new file
        if( $skeleton )
        {
            // Security fix
            $skeleton = str_replace('..', '',  $skeleton);
            // $skeleton is the ful path of the file
            // It must start with this  : $appConf[$project]['skeletons.folder']

            if( !isset($appConf[$project]['skeletons.folder']) ) {
                return false;
            }

            if( substr($skeleton, 0, strlen($appConf[$project]['skeletons.folder']) ) !=  $appConf[$project]['skeletons.folder'] ) {
                return false;
            }


            $return['content'] = ( $skeleton == '-' ) ? '' : file_get_contents($skeleton);
            $return['warn_tab'] = false;
            $return['warn_encoding'] = false;
            $return['xmlid'] = '';
            return JsonResponseBuilder::success($return);
        }

        $t = explode('/', $FilePath);
        $FileLang = array_shift($t);
        $FilePath = implode('/', $t);

        // We must detect the encoding of the file with the first line "xml version="1.0" encoding="utf-8"
        // If this utf-8, we don't need to use utf8_encode to pass to this app, else, we apply it

        $file = new File($FileLang, $FilePath.$FileName);

        // If we want to get the translation from google translate API
        if( $ggTranslate ) {
            $content  = $file->translate();
            $return['content'] = $content;
            $return['warn_tab'] = false;
            $return['warn_encoding'] = false;
            $return['xmlid'] = '';
            $return['fileModified'] = false;
            return JsonResponseBuilder::success($return);
        }

        $content  = $file->read($readOriginal);
        $encoding = $file->getEncoding($content);
        $info     = $file->getInfo($content);

        $return = array();
        $return['warn_encoding'] = false;

        if (strtoupper($encoding) == 'UTF-8') {
            $return['content'] = $content;
        } else {
            $return['content'] = iconv($encoding, "UTF-8", $content);

            // We mark this file to be automatically modified by codemirror only if this file is a lang/ or en/ file.
            if( RepositoryManager::getInstance()->isValidLanguage($FileLang) ) { $return['warn_encoding'] = true; }

        }

        if (isset($info['xmlid'])) {
            $return['xmlid'] = $info['xmlid'];
        }

        // Warn if this file contains some tab caracter, we replace it with 4 space
        if( strstr($return['content'], "\t") )
        {
            $return['content'] = str_replace("\t", "    ", $return['content']);
            $return['warn_tab'] = true;
        } else
        {
            $return['warn_tab'] = false ;
        }

        // We must check if this file isn't own by the current user
        $return['fileModified'] = $file->isModified();

        // We return the rev number too
        $return['originalRev'] = $info['rev'];

        return JsonResponseBuilder::success($return);
    }

    /**
     * Check if a file have an error according to ToolsError's class.
     */
    public function checkFileError()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }
        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');
        $FileLang = $this->getRequestVariable('FileLang');

        // Remove \
        $FileContent = stripslashes($this->getRequestVariable('FileContent'));

        // Replace &nbsp; by space
        $FileContent = str_replace("&nbsp;", "", $FileContent);

        $file = new File($FileLang, $FilePath.$FileName);
        // Detect encoding
        $charset = $file->getEncoding($FileContent);

        // If the new charset is set to utf-8, we don't need to decode it
        if ($charset != 'utf-8') {
            // Utf8_decode
            $FileContent = utf8_decode($FileContent);
        }

        // Get EN content to check error with
        $en_file    = new File('en', $FilePath.$FileName);
        $readOriginal = true;
        $en_content = $en_file->read($readOriginal);

        // Update DB with this new Error (if any)
        $info = $file->getInfo($FileContent);
        $anode[0] = array(
            'lang'         => $FileLang,
            'path'         => $FilePath,
            'name'         => $FileName,
            'en_content'   => $en_content,
            'lang_content' => $FileContent,
            'maintainer'   => $info['maintainer']
        );

        $errorTools = new ToolsError();
        $r = $errorTools->updateFilesError($anode, 'nocommit');

        return JsonResponseBuilder::success(
            array(
                'error'       => $r['state'],
                'error_first' => $r['first']
            )
        );
    }

    /**
     *
     */
    public function checkXml()
    {
        $am = AccountManager::getInstance();
        $tx = new ToolsXmllint();
        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $fileContent = $this->getRequestVariable('fileContent');

        // Replace &nbsp; by space
        $fileContent = str_replace("&nbsp;", "", $fileContent);

        $r = $tx->checkForError($fileContent);

        return JsonResponseBuilder::success(
            array(
                'errors' => $r
            )
        );

    }
    /**
     * Save a file. The new file have an extension like ".new", and is saved in the same folder as the original.
     *
     * @HERE : The new file no more have an extension '.new'. Now, it's saved into 'module-name-'new folder, with the same folder's hierarchie
     *
     *
     */
    public function saveFile()
    {
        $am = AccountManager::getInstance();
        $tx = new ToolsXmllint();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $filePath   = $this->getRequestVariable('filePath');
        $fileName   = $this->getRequestVariable('fileName');
        $fileLang   = $this->getRequestVariable('fileLang');
        $type       = $this->hasRequestVariable('type')
                        ? $this->getRequestVariable('type')
                        : 'file';
        $emailAlert = $this->hasRequestVariable('emailAlert')
                        ? $this->getRequestVariable('emailAlert')
                        : '';

        // Clean up path
        $filePath = str_replace('//', '/', $filePath);

        // Extract lang from path
        if ($fileLang == 'all') {
            $t = explode('/', $filePath);

            $fileLang = $t[0];

            array_shift($t);
            $filePath = '/'.implode('/', $t);
        }

        // Remove \
        $fileContent = $this->getRequestVariable('fileContent');

        // Replace &nbsp; by space
        $fileContent = str_replace("&nbsp;", "", $fileContent);

        // We check the Xml consistence only for .xml file
        if( substr($fileName, -3) == 'xml' ) {
            $xmlError = $tx->checkForError($fileContent);

            if( $xmlError != 'no_error' ) {
                return JsonResponseBuilder::failure(
                        array(
                            'XmlError' => $xmlError
                        )
                );
            }
        }

        // Get file object
        $file = new File($fileLang, $filePath.$fileName);

        // Rules to allow this file to be saved or not.
        if( $infoModified = $file->isModified() ) {

            $infoModified = json_decode($infoModified);

            // If the user who have modified this file isn't the current one
            if( $am->userID == $infoModified->userID ) {
                    // We can modify it, it's mine ;)
            } else {
                    // If the current user have karma, he can modify it.
                    if( $am->haveKarma ) {
                            // The current user can modify it
                    } else {
                            // We must trow an error. We can't modify it.

                        return JsonResponseBuilder::failure(
                                array(
                                    'type' => 'save_you_cant_modify_it'
                                )
                        );
                    }
            }
        }

        // Detect encoding
        $charset = $file->getEncoding($fileContent);

        // If the new charset is set to utf-8, we don't need to decode it
        if ($charset != 'utf-8') {
            $fileContent = iconv("UTF-8", $charset, $fileContent);
        }

        // We detect tab caracters and trow an error if we find one.
        if( strstr("\t", $fileContent) ) {
            return JsonResponseBuilder::failure(
                array(
                    'type' => 'tabs_found'
                )
            );
        }

        // Get revision
        $info = $file->getInfo($fileContent);

        if ($type == 'file') {

            $er = $file->save($fileContent);
            $isError = is_array($er) && empty($er['state']);

            if( !$isError ) {

                $r = RepositoryManager::getInstance()->addProgressWork(
                    $file, $info['rev'], $info['en-rev'], $info['reviewed'], $info['reviewed_maintainer'], $info['maintainer']
                );

                return JsonResponseBuilder::success(
                    array(
                        'id'           => $r,
                        'lang'         => $fileLang,
                        'revision'     => $info['rev'],
                        'en_revision'  => $info['en-rev'],
                        'maintainer'   => $info['maintainer'],
                        'reviewed'     => $info['reviewed'],
                        'reviewed_maintainer' => $info['reviewed_maintainer']
                    )
                );
            } else {
                return JsonResponseBuilder::failure(
                    array(
                        'type' => 'fs_error'
                    )
                );
            }
        } else if ($type == 'trans') {

            // We must ensure that this folder exist localy
            if( $file->folderExist() ) {

               $er = $file->save($fileContent);

               if( $er['state'] ) {

                   $r = RepositoryManager::getInstance()->addProgressWork(
                       $file, $info['rev'], $info['en-rev'], $info['reviewed'], $info['reviewed_maintainer'], $info['maintainer'], 'new'
                   );

                   return JsonResponseBuilder::success(
                       array(
                           'id'           => $r,
                           'lang'         => $fileLang,
                           'revision'     => $info['rev'],
                           'en_revision'  => $info['en-rev'],
                           'maintainer'   => $info['maintainer'],
                           'reviewed'     => $info['reviewed'],
                           'reviewed_maintainer' => $info['reviewed_maintainer']
                       )
                   );

               } else {
                   return JsonResponseBuilder::failure(
                       array(
                           'type' => 'fs_error'
                       )
                   );
               }
            } else {
              return JsonResponseBuilder::failure();
            }
        }
    }

    /**
     * Get VCS log for a given file.
     */
    public function getLog()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }
        $Path = $this->getRequestVariable('Path');
        $File = $this->getRequestVariable('File');

        $r = VCSFactory::getInstance()->log($Path, $File);

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );
    }

    /**
     * Get Acronyms to be display into a grid into the "All files modules"
     */
    public function getAcronyms()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $r = EntitiesAcronymsFetcher::getInstance()->getAcronyms();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );
    }

    /**
     * Update a single folder recursively
     */
    public function updateFolder()
    {
        $am = AccountManager::getInstance();
        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $rm = RepositoryManager::getInstance();
        $path = $this->getRequestVariable('path');

        $r = $rm->updateFolder($path);

        return JsonResponseBuilder::success(
            array(
                'result' => $r
            )
        );
    }

    /**
     * Get the response after an update single folder
     */
    function getUpdateFolderResponse()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        return JsonResponseBuilder::success(
            array(
                'result' => json_encode($_SESSION['updateFolder'])
            )
        );
    }

    /**
     * Get Entities to be display into a grid into the "All files modules"
     */
    public function getEntities()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $path = $this->getRequestVariable('path');

        $r = EntitiesAcronymsFetcher::getInstance()->getEntities();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );
    }

    /**
     * Get the diff of a given file
     */
    public function getDiff()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $DiffType = $this->getRequestVariable('DiffType');
        $FileFullPath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');

        $t = explode('/', $FileFullPath, 2);
        $FileLang = $t[0];
        $FilePath = $t[1];

        $opt = null;

        if( $DiffType == 'vcs' ) {
            $Rev1 = $this->getRequestVariable('Rev1');
            $Rev2 = $this->getRequestVariable('Rev2');

            // Ensure Rev2 is always a value greater than Rev1
            if( $Rev2 < $Rev1 )
            {
                $tmp  = $Rev2;
                $Rev2 = $Rev1;
                $Rev1 = $tmp;
            }
            $r = VCSFactory::getInstance()->diff(
                $FileFullPath,
                $FileName,
                $Rev1,
                $Rev2
            );

        } elseif( $DiffType == 'file') {

            $patchID = $this->getRequestVariable('patchID');
            $optNbLine = $this->getRequestVariable('optNbLine');
            $optB = $this->getRequestVariable('optB');
            $optW = $this->getRequestVariable('optW');

            if ($patchID) {
                $r = File::patchDiff($patchID);
            } else {
                $file = new File($FileLang, $FilePath.$FileName);
                $r = $file->diff($optNbLine, $optB, $optW);
            }

        }

        $r = DiffGenHTMLOutput($r);
        return JsonResponseBuilder::success(
            array(
                 'content' => $r
            )
        );
    }

    /**
     * Erase personal data from this application (cleanUp the database)
     */
    public function erasePersonalData()
    {
        $am = AccountManager::getInstance();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        if ( $am->isAnonymous ) {
            return JsonResponseBuilder::failure();
        }

        $am->eraseData();

        return JsonResponseBuilder::success();
    }

    /**
     * Get user list
     */
    public function getVCSUsers()
    {
        $am = AccountManager::getInstance();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $users = $am->getVCSUsers();

        return JsonResponseBuilder::success(
            array(
                 'nbItems' => count($users),
                 'Items'   => $users
            )
        );
    }

    /**
     *
     */
    public function setFileOwner()
    {
        $am = AccountManager::getInstance();
        $rf = RepositoryFetcher::getInstance();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $fileIdDB = $this->getRequestVariable('fileIdDB');
        $newOwnerID = $this->getRequestVariable('newOwnerID');

        $fileInfo = $rf->getModifiesById($fileIdDB);

        // This user must be a global admin or the admin for this lang
        // Or if the owner of this file is an anonymous and the current user is a valid user

        if($am->isAdmin(true))
        {
            $am->setFileOwner($fileIdDB, $newOwnerID);

            $value = array();
            $value['user'] = $am->vcsLogin;
            RepositoryManager::getInstance()->setStaticValue('info', 'changeFilesOwner', json_encode($value), true);

            return JsonResponseBuilder::success();
        } else {
            return JsonResponseBuilder::failure(
                array(
                    'type' => 'changeFilesOwnerNotAdmin'
                )
            );
        }
    }

    /**
     * Get the commit log Message after a VCS commit.
     */
    public function getCommitLogMessage()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }
        $r = LogManager::getInstance()->getCommitLog();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );
    }

    /**
     * Revert a modification made in a file
     */
    public function clearLocalChange()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $FileType = $this->getRequestVariable('FileType');
        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');

        $t = explode('/', $FilePath);
        $FileLang = array_shift($t);
        $FilePath = implode('/', $t);

        // If we are on root node, FilePath is empty. He must be "/".
        if( $FilePath == '' ) $FilePath = '/';

        $info = RepositoryManager::getInstance()->clearLocalChange(
            $FileType, new File($FileLang, $FilePath.$FileName)
        );

        if(is_array($info)) {
            return JsonResponseBuilder::success(
                array(
                    'path'       => $FilePath,
                    'name'       => $FileName,
                    'lang'       => $FileLang,
                    'revision'   => $info['rev'],
                    'en-revision'=> $info['en-rev'],
                    'maintainer' => $info['maintainer'],
                    'error'      => $info['errorFirst'],
                    'reviewed'   => $info['reviewed'],
                    'oldIdDB'    => (int)$info['oldIdDB']
                )
            );
        } else {
            return JsonResponseBuilder::failure(
                array(
                    'err' => $info
                )
            );
        }
    }

    /**
     * Get the content of a log's file
     */
    public function getLogFile()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $file = $this->getRequestVariable('file');

        $content = LogManager::getInstance()->readOutputLog($file);

        return JsonResponseBuilder::success(
            array(
                'mess' => $content
            )
        );
    }

    /**
     * Check the entities
     */
    public function checkEntities()
    {
        $ac = AccountManager::getInstance();

        if (!$ac->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        if ($ac->isAnonymous) {
            return JsonResponseBuilder::failure();
        }

        $lock = new LockFile('project_' . $ac->project . '_lock_check_entities');
        if ($lock->lock()) {

            ToolsCheckEntities::getInstance()->startCheck();

        }
        // Remove the lock File
        $lock->release();

        $info = array();
        $info['user']   = $ac->vcsLogin;

        RepositoryManager::getInstance()->setStaticValue('info', 'checkEntities', json_encode($info), true);

        return JsonResponseBuilder::success();
    }

    /**
     * Check the build for a given LANG documentation
     */
    public function checkBuild()
    {
        $am = AccountManager::getInstance();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        if ( !$am->isGlobalAdmin() && !$am->isLangAdmin() ) {
            return JsonResponseBuilder::failure(
                array(
                    'type' => 'action_only_admin'
                )
            );
        }

        $xmlDetails = $this->getRequestVariable('xmlDetails');
        $return = "";

        $lang = $am->vcsLang;

        $lock = new LockFile('project_'.$am->project.'_lock_check_build_'.$lang);
        if ($lock->lock()) {

            // Remove old log from DB
            RepositoryManager::getInstance()->cleanUpBeforeCheckBuild();

            // Start the checkBuild system
            $return = RepositoryManager::getInstance()->checkBuild($lang, $xmlDetails);
        }
        // Remove the lock File
        $lock->release();

        // Send output into a log file
        LogManager::getInstance()->saveOutputLog('project_'.$am->project.'_log_check_build_'.$lang, $return["logContent"]);

        // If the state of this build is ko, we save it into DB
        if( $return["state"] == 'ko' ) {
            LogManager::getInstance()->saveFailedBuild($lang, $return["logContent"]);
        }

        return JsonResponseBuilder::success();
    }

    /**
     * Get the response of the VCS after a commit
     */
    public function getCommitResponse()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        return JsonResponseBuilder::success(
            array(
                'mess' => $_SESSION['commitResponse']
            )
        );

    }

    /**
     * Commit modified files.
     */
    public function vcsCommit()
    {
        $am = AccountManager::getInstance();
        $rm = RepositoryManager::getInstance();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        if ( !$am->haveKarma ) {
            return JsonResponseBuilder::failure();
        }

        $patchID = $this->getRequestVariable('patchID');
        $nodes = $this->getRequestVariable('nodes');
        $logMessage = stripslashes($this->getRequestVariable('logMessage'));

        $anode = json_decode(stripslashes($nodes));

        $commitResponse = $tmp = '';

        // We create a lock for this commit process

        $lock = new LockFile('project_'.$am->project.'_lock_'.$am->vcsLogin.'_commit');

        if ($lock->lock()) {

            $tmp = $rm->commitChanges($anode, $logMessage);
            $commitResponse = $tmp['commitResponse'];
            $anode          = $tmp['anode'];
            $err            = $tmp['err'];

            // Store the response into session to display later
            $_SESSION['commitResponse'] = $commitResponse;

            if (0 == $err) {

                // Start all process after the VCS commit (related to db changes)
                $nodes = RepositoryFetcher::getInstance()->getModifiesById($anode);

                // We need to provide a different treatment regarding the file's type...
                $existFiles = array(); // Can be an updated file or a new file
                $deleteFiles = array();
                $j = 0;

                for ($i = 0; $i < count($nodes); $i++) {

                    if( $nodes[$i]['type'] == 'update' || $nodes[$i]['type'] == 'new' ) {
                        $existFiles[] = new File(
                            $nodes[$i]['lang'],
                            $nodes[$i]['path'].$nodes[$i]['name']
                        );
                    }

                    if( $nodes[$i]['type'] == 'delete' ) {
                        $deleteFiles[$j]->lang = $nodes[$i]['lang'];
                        $deleteFiles[$j]->path = $nodes[$i]['path'];
                        $deleteFiles[$j]->name = $nodes[$i]['name'];
                        $j ++;
                    }

                }

                // ... for existing Files (new or update)
                if( !empty($existFiles) ) {

                    // Update revision & reviewed for all this files (LANG & EN)
                    $rm->updateFileInfo($existFiles);

                    // Remove all this files in work
                    $rm->delWork($existFiles);

                } // End of $existFiles stuff

                // ... for deleted Files
                if( !empty($deleteFiles) ) {

                    // Remove this files from db
                    $rm->delFiles($deleteFiles);

                    // Remove all this files in work tables
                    $rm->delWork($deleteFiles);

                } // End of $deleteFiles stuff

                // We re-compute summary statistics for the global documentation & by translators
                $lang = AccountManager::getInstance()->vcsLang;
                $rm->updateTranslatorInfo();
                TranslationStatistic::getInstance()->computeSummary($lang);
                TranslatorStatistic::getInstance()->computeSummary($lang);
            }
        }

        // Manage log message (add new or ignore it if this message already exist for this user)
        LogManager::getInstance()->addCommitLog($logMessage);


        // We send an email only if this commit is from a patch
        if( $patchID ) {
            $rm->postPatchCommit($patchID);
        }

        // Remove the lock File
        $lock->release();

        return JsonResponseBuilder::success(
            array(
                'mess' => $commitResponse
            )
        );
    }

    /**
     * Get the UI's configuration for the current user
     */
    public function getConf()
    {
        $am = AccountManager::getInstance();
        $rf = RepositoryFetcher::getInstance();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $r = array();
        $r['project']   = $am->project;
        $r['userLang']  = $am->vcsLang;
        $r['authService']  = $am->authService;
        $r['authServiceID']  = $am->authServiceID;
        $r['userID'] = $am->userID;
        $r['userLogin'] = $am->vcsLogin;
        $r['userAnonymousIdent']  = $am->anonymousIdent;
        $r['userIsAnonymous']  = $am->isAnonymous;
        $r['userHaveKarma'] = $am->haveKarma;
        $r['userIsGlobalAdmin']  = $am->isGlobalAdmin();
        $r['userIsLangAdmin']  = $am->isLangAdmin();
        $r['userConf']  = $am->userConf;
        $r['userEmail'] = $am->email;
        $r['topicInfo']['global'] = $rf->getStaticValue('main_topic', '');
        $r['topicInfo']['lang'] = $rf->getStaticValue('main_topic', $am->vcsLang);
        $r['appConf']   = Array(
            "projectMailList" => $am->appConf[$am->project]['project.mail.list'],
            "viewVcUrl"       => $am->appConf[$am->project]['viewVc.url']
        );

        return JsonResponseBuilder::success(
            array(
                'mess' => $r
            )
        );
    }

    /**
     * Set the topic.
     */
    public function setTopic()
    {
        $am = AccountManager::getInstance();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        if (!$am->haveKarma) {
            return JsonResponseBuilder::failure();
        }

        $content = $this->getRequestVariable('content');
        $isLang = (bool) ($this->getRequestVariable('lang') == 'lang');

        $params = Array(
            'content' => $content,
            'author' => $am->vcsLogin,
            'topicDate' => @date('Y-m-d H:i:s')
        );

        RepositoryManager::getInstance()->setStaticValue('main_topic', $isLang ? $am->vcsLang : '', json_encode($params));

        return JsonResponseBuilder::success($params);

    }
    /**
     * Send an email.
     */
    public function sendEmail()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        if (AccountManager::getInstance()->isAnonymous) {
            return JsonResponseBuilder::failure();
        }

        $to      = $this->getRequestVariable('to');
        $subject = $this->getRequestVariable('subject');
        $msg     = $this->getRequestVariable('msg');

        AccountManager::getInstance()->email($to, $subject, $msg);

        return JsonResponseBuilder::success();
    }

    /**
     * Update a given UI configuration's option for the current user
     */
    public function confUpdate()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $module   = $this->getRequestVariable('module');
        $itemName = $this->getRequestVariable('itemName');
        $value    = $this->getRequestVariable('value');

        AccountManager::getInstance()->updateConf($module, $itemName, $value);

        return JsonResponseBuilder::success();
    }

    /**
     * Get all files from the repository. Also used to search for some files into the current LANG & EN documentation
     */
    public function getAllFiles()
    {
        $am = AccountManager::getInstance();
        $rf = RepositoryFetcher::getInstance();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $node   = $this->getRequestVariable('node');
        $search = $this->getRequestVariable('search');

        if ($this->hasRequestVariable('search')) {
            $files = $rf->getFileByKeyword($search);
        } else {
            $files = $rf->getFilesByDirectory($node);
        }

        return JsonResponseBuilder::response($files);
    }

    /**
     * Save a log message into DB to use it later
     */
    public function saveLogMessage()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        if (AccountManager::getInstance()->isAnonymous) {
            return JsonResponseBuilder::failure();
        }

        $messID = $this->getRequestVariable('messID');
        $mess   = stripslashes($this->getRequestVariable('mess'));

        LogManager::getInstance()->updateCommitLog($messID, $mess);

        return JsonResponseBuilder::success();
    }

    /**
     * Delete a log message from the DB
     */
    public function deleteLogMessage()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        if (AccountManager::getInstance()->isAnonymous) {
            return JsonResponseBuilder::failure();
        }

        $messID = $this->getRequestVariable('messID');

        LogManager::getInstance()->delCommitLog($messID);

        return JsonResponseBuilder::success();
    }

    /**
     * Get all files for a given Extension. Allow user who reviewed the documentation to open all files about a given extension.
     */
    public function getAllFilesAboutExtension()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $ExtName = $this->getRequestVariable('ExtName');

        $r = RepositoryFetcher::getInstance()->getFilesByExtension($ExtName);

        return JsonResponseBuilder::success(
            array(
                'files' => $r
            )
        );
    }

    /**
     * Get data about the CheckEntities's tools (ToolsCheckEntities's class).
     */
    public function getCheckEntitiesData()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $ToolsCheckEntities = new ToolsCheckEntities();
        $r = $ToolsCheckEntities->getData();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get data about the CheckDoc's tools (ToolsCheckDoc's class).
     */
    public function getCheckDocData()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $ToolsCheckDoc = new ToolsCheckDoc();
        $r = $ToolsCheckDoc->getCheckDocData();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Start the dowload of a given Failed build
     */
    public function downloadFailedBuildLog()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $idFailedBuild = $this->getRequestVariable('idFailedBuild');

        $r['mess'] = LogManager::getInstance()->getFailedBuildData($idFailedBuild, false);

        $name = 'failed-build-' . time() . '.txt';
        $content = implode("\r\n", $r['mess']);

        $size = strlen($content);

        header("Content-Type: application/force-download; name=\"$name\"");
        header("Content-Transfer-Encoding: binary");
        header("Content-Disposition: attachment; filename=\"$name\"");
        header("Expires: 0");
        header("Cache-Control: no-cache, must-revalidate");
        header("Pragma: no-cache");

        return $content;
    }

    /**
     * Get the content of a failed build
     */
    public function getFailedBuildData()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $idFailedBuild = $this->getRequestVariable('idFailedBuild');

        $r['mess'] = LogManager::getInstance()->getFailedBuildData($idFailedBuild);
        $r['state'] = 'full';

        if( count($r['mess']) > 50 ) {
          $r['mess'] = array_slice($r['mess'], 0, 50);
          $r['state'] = 'truncate';
        }

        return JsonResponseBuilder::success(
            array(
                'mess'  => $r['mess'],
                'state' => $r['state']
            )
        );
    }

    /**
     * Get all failed build
     */
    public function getFailedBuild()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $r = LogManager::getInstance()->getFailedBuild();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => $r['nb'],
                'Items'   => $r['node']
            )
        );
    }

    /**
     * Get all files about the CheckDoc's tools (ToolsCheckDoc's class).
     */
    public function getCheckDocFiles()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $path      = $this->getRequestVariable('path');
        $errorType = $this->getRequestVariable('errorType');

        $ToolsCheckDoc = new ToolsCheckDoc();
        $r = $ToolsCheckDoc->getCheckDocFiles($path, $errorType);

        return JsonResponseBuilder::success(
            array(
                'files' => $r
            )
        );
    }

    /**
     * Delete a patch.
     * @params patchID The ID of the patch we want to delete
     */
    public function deletePatch()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $patchID = $this->getRequestVariable('patchID');

        $r = RepositoryManager::getInstance()->deletePatch($patchID);

        if( $r === true ) {
            return JsonResponseBuilder::success();
        } else {
            return JsonResponseBuilder::failure(
                array(
                    'err' => $r
                )
            );
        }
    }
    /**
     * Get patch List for a the current user
     *
     */
    public function getPatchList()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $r = RepositoryFetcher::getInstance()->getPatchList();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );
    }

    /**
     * Manage patch.
     * @params patchID : If provided, the patch name will be modify by the given name
     */
    public function managePatch()
    {
        $rm = RepositoryManager::getInstance();

        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $name        = $this->getRequestVariable('name');
        $description = $this->getRequestVariable('description');
        $email       = $this->getRequestVariable('email');
        $patchID     = $this->getRequestVariable('patchID');

        if( $patchID != "false" ) {
            $r = $rm->modPatch($patchID, $name, $description, $email);

            if( $r != true ) {

                return JsonResponseBuilder::failure(
                    array(
                        'err' => $r
                    )
                );
            } else {
                return JsonResponseBuilder::success();
            }

        } else {
            $r = $rm->createPatch($name, $description, $email);
            return JsonResponseBuilder::success(
                array(
                    'patchID' => $r
                )
            );
        }

    }

    /**
     * Move some files to work in progress module
     */
    public function moveToWork()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $filesID = $this->getRequestVariable('filesID');

        $r = RepositoryManager::getInstance()->moveToWork($filesID);

        if( $r === true ) {
            return JsonResponseBuilder::success();
        } else {
            return JsonResponseBuilder::failure(
                array(
                    'err' => $r
                )
            );
        }
    }

    /**
     * Move some files to a patch
     */
    public function moveToPatch()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $patchID = $this->getRequestVariable('patchID');
        $filesID = $this->getRequestVariable('filesID');

        $r = RepositoryManager::getInstance()->moveToPatch($patchID, $filesID);

        if( $r === true ) {
            return JsonResponseBuilder::success();
        } else {
            return JsonResponseBuilder::failure(
                array(
                    'err' => $r
                )
            );
        }
    }


    /**
     * Define the progression of a file
     */
    public function SetFileProgress()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $idDB     = $this->getRequestVariable('idDB');
        $progress = $this->getRequestVariable('progress');

        $r = RepositoryManager::getInstance()->SetFileProgress($idDB, $progress);

        if( $r === true ) {
            return JsonResponseBuilder::success();
        } else {
            return JsonResponseBuilder::failure(
                array(
                    'err' => $r
                )
            );
        }
    }

    /**
     * Start the dowload of a given patch
     */
    public function downloadPatch()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $FileFullPath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');
        $patchID = $this->getRequestVariable('patchID');

        $t = explode('/', $FileFullPath, 2);
        $FileLang = $t[0];
        $FilePath = $t[1];

        if ($patchID) {
            $patch = File::patchDiff($patchID);
        } else {
            $file  = new File($FileLang, $FilePath.$FileName);
            $patch = $file->diff();
        }

        $name = 'patch-' . time() . '.patch';

        header("Content-Type: application/force-download; name=\"$name\"");
        header("Content-Transfer-Encoding: binary");
        header("Content-Disposition: attachment; filename=\"$name\"");
        header("Expires: 0");
        header("Cache-Control: no-cache, must-revalidate");
        header("Pragma: no-cache");

        return implode("\n", $patch);
    }

    /**
     * Logout from this application
     */
    public function logout()
    {
        $am = AccountManager::getInstance();
        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $value = array();
        $value['user'] = $am->vcsLogin;
        RepositoryManager::getInstance()->setStaticValue('info', 'logout', json_encode($value), true);

        $_SESSION = array();
        setcookie(session_name(), '', time()-42000, '/');
        session_destroy();
        header("Location: ../");
        exit;
    }

    /**
     * Get information to build the language specific graph
     */
    public function getGraphLang()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $lang = AccountManager::getInstance()->vcsLang;

        $summary = RepositoryFetcher::getInstance()->getStaticValue('translation_summary', $lang);

        // If we don't have a summary, compute one and try again
        if ($summary === false)
        {
            TranslationStatistic::getInstance()->computeSummary($lang);
            $summary = RepositoryFetcher::getInstance()->getStaticValue('translation_summary', $lang);
        }

        $return = array();
        if ($lang !== 'en')
        {
            $return[0]['id'] = $summary[0]->id;
            $return[0]['libel'] = $summary[0]->libel;
            $return[0]['total'] = $summary[0]->nbFiles;

            $return[1]['id'] = $summary[1]->id;
            $return[1]['libel'] = $summary[1]->libel;
            $return[1]['total'] = $summary[1]->nbFiles;

            $return[2]['id'] = $summary[2]->id;
            $return[2]['libel'] = $summary[2]->libel;
            $return[2]['total'] = $summary[2]->nbFiles;
        }

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($return),
                'Items'   => $return
            )
        );

    }

    /**
     * Get information to build the graph for all languages
     */
    public function getGraphLangs()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $return = array();

        $j=0;

        $langs = RepositoryManager::getInstance()->availableLang;

        sort($langs);

        foreach ($langs as $lang) {

            $langCode = $lang["code"];
            $langName = $lang["name"];
            $summary = RepositoryFetcher::getInstance()->getStaticValue('translation_summary', $langCode);

            if( isset($summary[0]) && !empty($summary[0]->nbFiles) ) {
                $return[$j]['id']        = $j;
                $return[$j]['libel']     = $langCode;
                $return[$j]['fullLibel'] = $langName;
                $return[$j]['total']     = $summary[0]->nbFiles;
                $return[$j]['percent']   = $summary[0]->percentFiles;

                $j ++;
            }
        }

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($return),
                'Items'   => $return
            )
        );

    }

    /**
     * Mark a file to be deleted
     */
    public function markAsNeedDelete()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');

        $t = explode('/', $FilePath);
        $FileLang = array_shift($t);
        $FilePath = implode('/', $t);

        $file = new File($FileLang, $FilePath.$FileName);

        $r = RepositoryManager::getInstance()->addPendingDelete($file);

        return JsonResponseBuilder::success(
            array(
                'id'   => $r['id'],
                'by'   => $r['by'],
                'date' => $r['date']
            )
        );
    }

    public function getImageContent() {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $FileLang = $this->getRequestVariable('FileLang');
        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');

        $file  = new File($FileLang, $FilePath.$FileName);
        $imageContent = $file->getImageContent();

        header("Content-Type: ".$imageContent['content-type']);
        header("Expires: 0");
        header("Cache-Control: no-cache, must-revalidate");
        header("Pragma: no-cache");

        return $imageContent['content'];

    }

    /**
     * Dictionary : Manage a word. Delete or update it.
     */
    public function manageDictionaryWord()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        if (AccountManager::getInstance()->isAnonymous) {
            return JsonResponseBuilder::failure();
        }

        $wordId    = $this->getRequestVariable('wordId');
        $valueEn   = $this->getRequestVariable('valueEn');
        $valueLang = $this->getRequestVariable('valueLang');

        $dateUpdate = DictionaryManager::getInstance()->manageDictionaryWord($wordId, $valueEn, $valueLang);

        return JsonResponseBuilder::success(
            array(
                'dateUpdate' => $dateUpdate
            )
        );

    }

    /**
     * Dictionary : Get all works for a given language
     */
    public function getDictionaryWords()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $r = DictionaryManager::getInstance()->getWords();

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );

    }

    /**
     * Dictionary : Delete a word
     */
    public function delDictionaryWord()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        if (AccountManager::getInstance()->isAnonymous) {
            return JsonResponseBuilder::failure();
        }

        $wordId = $this->getRequestVariable('wordId');

        DictionaryManager::getInstance()->delWord($wordId);

        return JsonResponseBuilder::success();

    }

    /**
     * userNotes : Get all notes about a file
     */
    public function getUserNotes()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $file = $this->getRequestVariable('file');

        $r = UserNotes::getInstance()->getNotes($file);

        return JsonResponseBuilder::success(
            array(
                'nbItems' => count($r),
                'Items'   => $r
            )
        );

    }

    /**
     * userNotes : Add a new user note for a file
     */
    public function addUserNote()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        if (AccountManager::getInstance()->isAnonymous) {
            return JsonResponseBuilder::failure();
        }

        $file = $this->getRequestVariable('file');
        $note = $this->getRequestVariable('note');

        UserNotes::getInstance()->addNote($file, $note);

        return JsonResponseBuilder::success();
    }

    /**
     * userNotes : Delete a user note
     */
    public function delUserNote()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        if (AccountManager::getInstance()->isAnonymous) {
            return JsonResponseBuilder::failure();
        }

        $noteID = $this->getRequestVariable('noteID');

        $r = UserNotes::getInstance()->delNote($noteID);

        return JsonResponseBuilder::success(
            array(
                'result' => $r
            )
        );

    }

    /**
     *
     */
    public function previewFile()
    {
        if (!AccountManager::getInstance()->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $path = $this->getRequestVariable('path');

        $preview = new PreviewFile($path);

        return JsonResponseBuilder::success(
            array(
                'url' => $preview->getPreviewUrl(),
                'log' => array(
                    'buildCmd' => $preview->getBuildCmd(),
                    'buildLog' => $preview->buildLog,
                    'moveCmd'  => $preview->moveCmd,
                    'moveLog'  => $preview->moveLog,
                    'cleanCmd' => $preview->cleanCmd,
                    'cleanLog' => $preview->cleanLog,
                ),
            )
        );

    }

    /**
     *
     */
    public function getDirectActionData()
    {
        $am = AccountManager::getInstance();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $rf = RepositoryFetcher::getInstance();

        $action = $this->getRequestVariable('action');
        $idDB = $this->getRequestVariable('idDB');

        $fileInfo = $rf->getModifiesById($idDB);
        $fileInfo = $fileInfo[0];

        // We get the diff
        $file = new File(
                $fileInfo['lang'],
                $fileInfo['path'].$fileInfo['name']
                );

        return JsonResponseBuilder::success(
            array(
                'fileInfo' => $fileInfo,
                'userInfo' => $am->getUserDetailsByID($fileInfo['userID']),
                'vcsDiff' => DiffGenHTMLOutput($file->diff())
            )
        );

    }

    /**
     *
     */
    public function setDirectAction()
    {
        $am = AccountManager::getInstance();

        if (!$am->isLogged()) {
            return JsonResponseBuilder::failure();
        }

        $action = $this->getRequestVariable('action');
        $patchID = $this->getRequestVariable('patchID');
        $idDB = $this->getRequestVariable('idDB');


        if( $action == 'putIntoMyPatches' )
        {
            $r = RepositoryManager::getInstance()->moveToPatch($patchID, $idDB);

            if( $r === true ) {
                return JsonResponseBuilder::success();
            } else {
                return JsonResponseBuilder::failure(
                    array(
                        'err' => $r
                    )
                );
            }

        }

        if( $action == 'deleteThisChange' )
        {
            $r = RepositoryManager::getInstance()->clearLocalChangeByModifiedID($idDB);

            if( is_array($r) ) {
                return JsonResponseBuilder::success();
            } else {
                return JsonResponseBuilder::failure(
                    array(
                        'err' => $r
                    )
                );
            }

        }

    }

    /**
     *
     */
    public function getElephpants()
    {
        //$r = RepositoryManager::getInstance()->moveToPatch();

        $r = getFlickr();

        return JsonResponseBuilder::success(
            Array(
                'Items' => $r
            )

        );

    }
}
