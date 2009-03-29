<?php
/**
 * Ext JS controller class definition file
 * 
 * @todo Add inline documentation for each controller task
 */

/**
 * Required file
 */
require_once './class.php';

/**
 * Ext JS controller class
 */
class ExtJsController
{

    /**
     * A phpDoc instance
     *
     * @var phpDoc
     */
    private $phpDoc;
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
        $this->phpDoc = new phpDoc();
        $this->requestVariables = $request;
    }

    /**
     * Returns the JSON representation of a value
     *
     * @param mixed $value The value being encoded. Can be any type except a resource.
     * @return string The JSON encoded value on success
     */
    public function getResponse($value)
    {
        return json_encode($value);
    }

    /**
     * Gets the failure response
     * @package string $message An optional error message
     *
     * @return string The failure string.
     */
    public function getFailure($message = false)
    {
        $return = array('success' => false);
        if ($message) {
            $return['msg'] = $message;
        }
        return $this->getResponse($return);
    }

    /**
     * Gets the success response
     *
     * @return string The success string.
     */
    public function getSuccess()
    {
        return $this->getResponse(array('success' => true));
    }
    
    /**
     * Gets the specified request variable
     *
     * @param string $name The variable name
     * @return mixed The variable value on success, FALSE is the variable was not set
     */
    public function getRequestVariable($name)
    {
        return $this->hasRequestVariable($name) ? $this->requestVariables[$name] : false;
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
        $cvsLogin  = $this->getRequestVariable('cvsLogin');
        $cvsPasswd = $this->getRequestVariable('cvsPassword');
        $lang      = $this->getRequestVariable('lang');

        $response  = $this->phpDoc->login($cvsLogin,$cvsPasswd,$lang);

        if ($response['state'] === true) {
            // This user is already know in a valid user
            return $this->getSuccess();
        } elseif ($response['state'] === false) {
            // This user is unknow from this server
            return $this->getFailure($response['msg']);
        } else {
            return $this->getFailure();
        }
    }


    public function update_repository()
    {
        $this->phpDoc->isLogged();

        if ($this->phpDoc->cvsLogin == 'cvsread') {
            return $this->getFailure();
        }

        $this->phpDoc->updateRepository();
        return $this->getSuccess();
    }

    public function check_lock_file()
    {
        $lockFile = $this->getRequestVariable('lockFile');
        $this->phpDoc->isLogged();

        return $this->phpDoc->lockFileCheck($lockFile) ? $this->getSuccess() : $this->getFailure();
    }

    public function apply_tools()
    {
        $this->phpDoc->isLogged();

        $this->phpDoc->cleanUp();

        // Set the lock File
        $this->phpDoc->lockFileSet('lock_apply_tools');

        // Start Revcheck
        $this->phpDoc->rev_start();

        // Parse translators
        $this->phpDoc->rev_parse_translation();

        // Check errors in files
//        $tool = new ToolsError($_SESSION['lang']);
 //       $tool->run('/');

        // Remove the lock File
        $this->phpDoc->lockFileRemove('lock_apply_tools');

        return $this->getSuccess();
    }


    /**
     * Tests the CVS username against its password
     *
     * @return Success
     */
    public function testCvsLogin()
    {

        $cvsLogin  = $this->getRequestVariable('cvsLogin');
        $cvsPasswd = $this->getRequestVariable('cvsPasswd');

        $this->phpDoc->login($cvsLogin,$cvsPasswd);
        $r = $this->phpDoc->cvsLoggingIn();

        if ($r === true) {
            return $this->getSuccess();
        } else {
            return $this->getFailure(str_replace("\n", "", nl2br($r)));
        }
    }

    /*
    public function wizard_createworkspace() {
    $cvsLogin = $this->getRequestVariable('cvsLogin');
    $cvsPasswd = $this->getRequestVariable('cvsPasswd');
    $cvsLang = $this->getRequestVariable('cvsLang');
    $this->phpDoc->register_user($cvsLogin, $cvsPasswd, $cvsLang);
    $this->phpDoc->createWorkSpace();
    return $this->getSuccess();
    }
    */

    public function wizard_checkout()
    {
        $this->phpDoc->isLogged();
        $this->phpDoc->checkoutRepository();
        return $this->getSuccess();
    }

    /**
     * Pings the server and user session
     *
     * @return string "pong" on success, "false" on failure
     */
    public function ping()
    {
        return !isset($_SESSION['userID']) ? 'false' : 'pong';
    }

    //NEW
    public function GetFilesNeedUpdate() {
        $this->phpDoc->isLogged();
        $r = $this->phpDoc->get_files_need_update();
        return $this->getResponse(array('nbItems' => $r['nb'], 'Items' => $r['node']));
    }

    // NEW
    public function GetFilesNeedReviewed() {
        $this->phpDoc->isLogged();
        $r = $this->phpDoc->get_files_need_reviewed();
        return $this->getResponse(array('nbItems' => $r['nb'], 'Items' => $r['node']));
    }

    // NEW
    public function GetFilesError() {
        $this->phpDoc->isLogged();
        $r = $this->phpDoc->get_files_error();
        return $this->getResponse(array('nbItems' => $r['nb'], 'Items' => $r['node']));
    }

    // NEW
    public function GetFilesPendingCommit() {
        $this->phpDoc->isLogged();
        $r = $this->phpDoc->get_files_pending_commit();
        return $this->getResponse(array('nbItems' => $r['nb'], 'Items' => $r['node']));
    }

    // NEW
    public function GetFilesPendingPatch() {
        $this->phpDoc->isLogged();
        $r = $this->phpDoc->get_files_pending_patch();
        return $this->getResponse(array('nbItems' => $r['nb'], 'Items' => $r['node']));
    }

    //NEW
    public function get_translator_info() {

        $this->phpDoc->isLogged();

        $translators = $this->phpDoc->get_translators_info();
        return $this->getResponse(array('nbItems' => count($translators), 'Items' => $translators));
    }

    //NEW
    public function get_summary_info() {

        $this->phpDoc->isLogged();

        $summary = $this->phpDoc->get_summary_info();
        return $this->getResponse(array('nbItems' => count($summary), 'Items' => $summary));
    }

    public function get_mailing_info() {

        $this->phpDoc->isLogged();
        $r = $this->phpDoc->get_last_mailing();
        return $this->getResponse(array('nbItems' => count($r), 'Items' => $r));
    }

    public function get_open_bugs() {

        $this->phpDoc->isLogged();
        $r = $this->phpDoc->get_last_bugs();
        return $this->getResponse(array('nbItems' => count($r), 'Items' => $r));
    }

    public function get_file() {
        $this->phpDoc->isLogged();

        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');

        // We must detect the encoding of the file with the first line "xml version="1.0" encoding="utf-8"
        // If this utf-8, we don't need to use utf8_encode to pass to this app, else, we apply it

        $file = $this->phpDoc->getFileContent($FilePath, $FileName);

        $return = array('success' => true);

        if (strtoupper($file['charset']) == 'UTF-8') {
            $return['content'] = $file['content'];
        } else {
            $return['content'] = iconv($file['charset'], "UTF-8", $file['content']);
        }
        return $this->getResponse($return);
    }


    // NEW
    public function check_file_error() {

        $this->phpDoc->isLogged();
        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');
        $FileLang = $this->getRequestVariable('FileLang');

        // Remove \
        $FileContent = stripslashes($this->getRequestVariable('FileContent'));

        // Replace &nbsp; by space
        $FileContent = str_replace("&nbsp;", "", $FileContent);

        // Detect encoding
        $charset = $this->phpDoc->getFileEncoding($FileContent, 'content');

        // If the new charset is set to utf-8, we don't need to decode it
        if ($charset != 'utf-8') {
            // Utf8_decode
            $FileContent = utf8_decode($FileContent);
        }

        // Get EN content to check error with
        $dirEN = $this->phpDoc->cvsDoc.'en'.$FilePath;
        $en_content = file_get_contents($dirEN.$FileName);

        // Do tools_error
        //$error = $this->phpDoc->tools_error_check_all($fileContent, $en_content);

        // Update DB with this new Error (if any)
        $anode[0] = array( 0 => $FilePath, 1 => $FileName, 2 => $FileLang);
        $r = $this->phpDoc->updateFilesError($anode, 'nocommit', $FileContent, $en_content);

        return $this->getResponse(array('success' => true, 'error' => $r['state'], 'error_first' => $r['first']));
    }

    // NEW
    public function save_file() {

        $this->phpDoc->isLogged();

        $filePath   = $this->getRequestVariable('filePath');
        $fileName   = $this->getRequestVariable('fileName');
        $fileLang   = $this->getRequestVariable('fileLang');
        $type       = $this->getRequestVariable('type') ? $this->getRequestVariable('type') : 'file';
        $emailAlert = $this->getRequestVariable('emailAlert') ? $this->getRequestVariable('emailAlert') : '';


        if ($this->phpDoc->cvsLogin == 'cvsread' && $type == 'file') {
            return $this->getFailure();
        }

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
        $fileContent = stripslashes($this->getRequestVariable('fileContent'));

        // Replace &nbsp; by space
        $fileContent = str_replace("&nbsp;", "", $fileContent);

        // Detect encoding
        $charset = $this->phpDoc->getFileEncoding($fileContent, 'content');

        // If the new charset is set to utf-8, we don't need to decode it
        if ($charset != 'utf-8') {
            // Utf8_decode
            //$fileContent = utf8_decode($fileContent);
            $fileContent = iconv("UTF-8", $charset, $fileContent);
        }

        // Get revision
        $info = $this->phpDoc->getInfoFromContent($fileContent);

        if ($type == 'file') {

            $this->phpDoc->saveFile($filePath.$fileName, $fileContent, $fileLang, 'file');
            $this->phpDoc->registerAsPendingCommit($fileLang, $filePath, $fileName, $info['rev'], $info['en-rev'], $info['reviewed'], $info['maintainer']);
            return $this->getResponse(array(
            'success' => true,
            'en_revision' => $info['rev'],
            'new_revision' => $info['en-rev'],
            'maintainer' => $info['maintainer'],
            'reviewed' => $info['reviewed']
            ));

        } else {
            $uniqID = $this->phpDoc->registerAsPendingPatch($fileLang, $filePath, $fileName, $emailAlert);
            $this->phpDoc->saveFile($filePath.$fileName, $fileContent, $fileLang, 'patch', $uniqID);
            return $this->getResponse(array(
            'success' => true,
            'uniqId' => $uniqID,
            ));
        }

    }

    // NEW
    public function get_log() {

        $this->phpDoc->isLogged();
        $Path = $this->getRequestVariable('Path');
        $File = $this->getRequestVariable('File');

        $r = $this->phpDoc->cvsGetLog($Path, $File);
        return $this->getResponse(array('nbItems' => count($r), 'Items' => $r));
    }

    public function get_diff() {

        $this->phpDoc->isLogged();
        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');
        $type     = $this->getRequestVariable('type') ? $this->getRequestVariable('type') : '';
        $uniqID   = $this->getRequestVariable('uniqID') ? $this->getRequestVariable('uniqID') : '';

        $info = $this->phpDoc->getDiffFromFiles($FilePath, $FileName, $type, $uniqID);
        return $this->getResponse(array(
        'success' => true,
        'content' => $info['content'],
        'encoding' => $info['charset'],
        ));
    }

    //NEW
    public function get_diff2() {

        $this->phpDoc->isLogged();
        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');
        $Rev1 = $this->getRequestVariable('Rev1');
        $Rev2 = $this->getRequestVariable('Rev2');

        $r = $this->phpDoc->getDiffFromExec($FilePath, $FileName, $Rev1, $Rev2);

        return $this->getResponse(array(
        'success' => true,
        'content' => $r,
        ));

    }

    public function erase_personal_data() {

        $this->phpDoc->isLogged();

        if ($this->phpDoc->cvsLogin == 'cvsread') {
            return $this->getFailure();
        }

        $this->phpDoc->erasePersonalData();
        return $this->getSuccess();

    }

    public function get_commit_log_message() {

        $this->phpDoc->isLogged();
        $r = $this->phpDoc->getCommitLogMessage();
        return $this->getResponse(array('nbItems' => count($r), 'Items' => $r));
    }

    public function update_single_file() {

        $file = $this->getRequestVariable('file');
        $path = $this->getRequestVariable('path');

        $this->phpDoc->isLogged();
        // Reel Update EN
        $this->phpDoc->cvsUpdateSingleFile($file, $path);
        // Reel Update Lang
        $this->phpDoc->cvsUpdateSingleFile($file, $path, 'lang');

        // Do revcheck for just this file
        $this->phpDoc->rev_on_oneFile($file, $path);

        // Need return EN_revision for translated file and revision of EN file

    }

    //NEW
    public function clear_local_change() {
        $this->phpDoc->isLogged();

        if ($this->phpDoc->cvsLogin == 'cvsread') {
            return $this->getFailure();
        }

        $FilePath = $this->getRequestVariable('FilePath');
        $FileName = $this->getRequestVariable('FileName');

        $info = $this->phpDoc->clearLocalChange($FilePath, $FileName);

        $return = array('success' => true);
        $return['revision']   = $info['rev'];
        $return['maintainer'] = $info['maintainer'];
        $return['error']      = $info['errorFirst'];
        $return['reviewed']   = $info['reviewed'];
        return $this->getResponse($return);
    }

    public function get_logfile()
    {

        $this->phpDoc->isLogged();

        $file = $this->getRequestVariable('file');

        $content = $this->phpDoc->getOutputLogFile($file);

        return $this->getResponse(array('success' => true, 'mess' => $content));

    }

    public function check_build()
    {

        $this->phpDoc->isLogged();

        if ($this->phpDoc->cvsLogin == 'cvsread') {
            return $this->getFailure();
        }

        $xmlDetails = $this->getRequestVariable('xmlDetails');

        // Set the lock File
        $this->phpDoc->lockFileSet('lock_check_build');

        // Start the checkBuild system
        $output = $this->phpDoc->checkBuild($xmlDetails);

        // Remove the lock File
        $this->phpDoc->lockFileRemove('lock_check_build');

        // Send output into a log file
        $this->phpDoc->saveOutputLogFile('log_check_build', $output);
        return $this->getSuccess();
    }

    public function cvs_commit() {
        $this->phpDoc->isLogged();

        if ($this->phpDoc->cvsLogin == 'cvsread') {
            return $this->getFailure();
        }

        $nodes = $this->getRequestVariable('nodes');
        $logMessage = stripslashes($this->getRequestVariable('logMessage'));

        $anode = json_decode(stripslashes($nodes));

        $r = $this->phpDoc->cvsCommit($anode, $logMessage);

        return $this->getResponse(array('success' => true, 'mess' => $r));
    }

    public function on_succes_commit() {

        $this->phpDoc->isLogged();

        if ($this->phpDoc->cvsLogin == 'cvsread') {
            return $this->getFailure();
        }

        $nodes = $this->getRequestVariable('nodes');
        $logMessage = stripslashes($this->getRequestVariable('logMessage'));

        $anode = json_decode(stripslashes($nodes));

        // Update revision & reviewed for all this files
        $this->phpDoc->updateRev($anode);

        // Update FilesError for all this files
        $this->phpDoc->updateFilesError($anode);

        // Remove all this files in needcommit
        $this->phpDoc->removeNeedCommit($anode);

        // Manage this logMessage
        $this->phpDoc->manageLogMessage($logMessage);
        return $this->getSuccess();

    }

    public function get_conf() {

        $this->phpDoc->isLogged();
        $r['userLang']  = $this->phpDoc->cvsLang;
        $r['userLogin'] = $this->phpDoc->cvsLogin;
        $r['userConf']  = $this->phpDoc->userConf;

        return $this->getResponse(array('success' => true, 'mess' => $r));
    }

    public function send_email() {

        $this->phpDoc->isLogged();

        $to      = $this->getRequestVariable('to');
        $subject = $this->getRequestVariable('subject');
        $msg     = $this->getRequestVariable('msg');
        
        $this->phpDoc->sendEmail($to, $subject, $msg);
        return $this->getSuccess();
    }

    public function conf_update() {

        $this->phpDoc->isLogged();

        $item      = $this->getRequestVariable('item');
        $value     = $this->getRequestVariable('value');

        $r = $this->phpDoc->updateConf($item, $value);
        return $this->getResponse(array('success' => true, 'msg' => $r));
    }

    public function getAllFiles() {

        $this->phpDoc->isLogged();

        $node  = $this->getRequestVariable('node');

        $files = $this->phpDoc->getAllFiles($node);

        return $this->getResponse($files);
    }

    public function save_LogMessage() {

        $this->phpDoc->isLogged();

        if ($this->phpDoc->cvsLogin == 'cvsread') {
            return $this->getFailure();
        }

        $messID = $this->getRequestVariable('messID');
        $mess   = stripslashes($this->getRequestVariable('mess'));

        $this->phpDoc->saveLogMessage($messID, $mess);
        return $this->getSuccess();
    }

    public function delete_LogMessage() {

        $this->phpDoc->isLogged();

        if ($this->phpDoc->cvsLogin == 'cvsread') {
            return $this->getFailure();
        }

        $messID = $this->getRequestVariable('messID');

        $this->phpDoc->deleteLogMessage($messID);
        return $this->getSuccess();
    }

    public function all_files_about_extension() {

        $this->phpDoc->isLogged();

        $ExtName = $this->getRequestVariable('ExtName');

        $r = $this->phpDoc->allFilesExtension($ExtName);

        return $this->getResponse(array('success' => true, 'files' => $r));
    }

    public function after_patch_accept() {

        $this->phpDoc->isLogged();

        $PatchUniqID = $this->getRequestVariable('PatchUniqID');

        $this->phpDoc->afterPatchAccept($PatchUniqID);
        return $this->getSuccess();
    }

    public function after_patch_reject() {

        $this->phpDoc->isLogged();

        if ($this->phpDoc->cvsLogin == 'cvsread') {
            return $this->getFailure();
        }

        $PatchUniqID = $this->getRequestVariable('PatchUniqID');

        $this->phpDoc->afterPatchReject($PatchUniqID);

        return $this->getSuccess();
    }

    public function get_check_doc_data() {

        $this->phpDoc->isLogged();

        $r = $this->phpDoc->get_Check_Doc_Data();

        return $this->getResponse(array('nbItems' => $r['nb'], 'Items' => $r['node']));
    }

    public function get_check_doc_files() {

        $this->phpDoc->isLogged();

        $path      = $this->getRequestVariable('path');
        $errorType = $this->getRequestVariable('errorType');

        $r = $this->phpDoc->get_Check_Doc_Files($path, $errorType);

        return $this->getResponse(array('success' => true, 'files' => $r));
    }

}