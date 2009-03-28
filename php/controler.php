<?php
session_start();
error_reporting(E_ALL);

include "./class.php";

$phpDoc = new phpDoc();


$task = isset($_POST['task']) ? $_POST['task'] : '';

// NEW
if ($task == 'login') {

    $cvsLogin  = $_POST['cvsLogin'];
    $cvsPasswd = $_POST['cvsPassword'];
    $lang      = $_POST['lang'];
    $r         = $phpDoc->login($cvsLogin,$cvsPasswd,$lang);

    if ($r['state'] === TRUE ) {

        // This user is already know in a valid user
        echo '{"success":true}';
        exit;

    } else if ( $r['state'] === FALSE ) {

        // This user is unknow from this server
        echo '{"success":false, "msg": "'.$r['msg'].'"}';
        exit;

    }

} //task login


if ($task == 'update-repo') {

    $phpDoc->isLogged();

    if ($phpDoc->cvsLogin == 'cvsread') {
        echo '{"success":false}';
        exit;
    }

    $phpDoc->updateRepository();
    echo '{"success":true}';
    exit;

}

if ($task == 'check-lock-file') {

    $lockFile = $_POST['lockFile'];
    $phpDoc->isLogged();

    if ($phpDoc->lockFileCheck($lockFile) ) {
        echo '{"success":true}';
    } else {
        echo '{"success":false}';
    }
    exit;

}

if ($task == 'apply-tools') {
    $phpDoc->isLogged();

    $phpDoc->cleanUp();

    // Set the lock File
    $phpDoc->lockFileSet('lock_apply_tools');

    // Start Revcheck
    $phpDoc->rev_start();

    // Parse translators
    $phpDoc->rev_parse_translation();

    // Check errors in files
    //$phpDoc->tools_error_start();

    // Remove the lock File
    $phpDoc->lockFileRemove('lock_apply_tools');

    echo '{"success":true}';
    exit;
}









if ($task == 'testCvsLogin') {

    $cvsLogin = $_POST['cvsLogin'];
    $cvsPasswd = $_POST['cvsPasswd'];

    $phpDoc->login($cvsLogin,$cvsPasswd);
    $r = $phpDoc->cvsLoggingIn();

    if ($r === TRUE ) {
        echo '{"success":true}';
    } else {
        echo '{"success":false,"msg":"'.str_replace("\n", "", nl2br($r)).'"}';
    }
    exit;
}

/*
if ($task == 'wizard-createworkspace') {

$cvsLogin = $_POST['cvsLogin'];
$cvsPasswd = $_POST['cvsPasswd'];
$cvsLang = $_POST['cvsLang'];
$phpDoc->register_user($cvsLogin, $cvsPasswd, $cvsLang);
$phpDoc->createWorkSpace();
echo '{"success":true}';
exit;
}
*/
if ($task == 'wizard-checkout') {

    $phpDoc->isLogged();
    $phpDoc->checkoutRepository();
    echo '{"success":true}';
    exit;

}


if ($task == 'ping') {
    if( !isset($_SESSION['userID']) ) {
        echo 'false';
    } else {
        echo 'pong';
    }
    exit;
}

//NEW
if ($task == 'GetFilesNeedUpdate') {
    $phpDoc->isLogged();
    $r = $phpDoc->get_files_need_update();
    echo '{"nbItems":'.$r['nb'].', "Items":'.json_encode($r['node']).'}';
    exit;
}

// NEW
if ($task == 'GetFilesNeedReviewed') {
    $phpDoc->isLogged();
    $r = $phpDoc->get_files_need_reviewed();
    echo '{"nbItems":'.$r['nb'].', "Items":'.json_encode($r['node']).'}';
    exit;
}

// NEW
if ($task == 'GetFilesError') {
    $phpDoc->isLogged();
    $r = $phpDoc->get_files_error();
    echo '{"nbItems":'.$r['nb'].', "Items":'.json_encode($r['node']).'}';
    exit;
}

// NEW
if ($task == 'GetFilesPendingCommit') {
    $phpDoc->isLogged();
    $r = $phpDoc->get_files_pending_commit();
    echo '{"nbItems":'.$r['nb'].', "Items":'.json_encode($r['node']).'}';
    exit;
}

// NEW
if ($task == 'GetFilesPendingPatch') {
    $phpDoc->isLogged();
    $r = $phpDoc->get_files_pending_patch();
    echo '{"nbItems":'.$r['nb'].', "Items":'.json_encode($r['node']).'}';
    exit;
}

//NEW
if ($task == 'get-translator-info') {

    $phpDoc->isLogged();

    $translators = $phpDoc->get_translators_info();

    echo '{"nbItems":'.count($translators).', "Items":'.json_encode($translators).'}';
    exit;
}

//NEW
if ($task == 'get-summary-info') {

    $phpDoc->isLogged();

    $summary = $phpDoc->get_summary_info();

    echo '{"nbItems":'.count($summary).', "Items":'.json_encode($summary).'}';
    exit;
}

if ($task == 'get-mailing-info') {

    $phpDoc->isLogged();
    $r = $phpDoc->get_last_mailing();
    echo '{"nbItems":'.count($r).', "Items":'.json_encode($r).'}';
    exit;
}

if ($task == 'get-open-bugs') {

    $phpDoc->isLogged();
    $r = $phpDoc->get_last_bugs();
    echo '{"nbItems":'.count($r).', "Items":'.json_encode($r).'}';
    exit;
}

if ($task == 'get-file') {
    $phpDoc->isLogged();

    $FilePath = $_POST['FilePath'];
    $FileName = $_POST['FileName'];

    // We must detect the encoding of the file with the first line "xml version="1.0" encoding="utf-8"
    // If this utf-8, we don't need to use utf8_encode to pass to this app, else, we apply it

    $file = $phpDoc->getFileContent($FilePath, $FileName);

    if( strtoupper($file['charset']) == 'UTF-8') {
        echo '{"success":true, "content":'.json_encode($file['content']).'}';
    } else {
        //echo '{"success":true, "content":'.json_encode(utf8_encode($file['content'])).'}';
        echo '{"success":true, "content":'.json_encode(iconv($file['charset'], "UTF-8", $file['content'])).'}';
    }

    exit;
}


// NEW
if ($task == 'check-file-error') {

    $phpDoc->isLogged();
    $FilePath = $_POST['FilePath'];
    $FileName = $_POST['FileName'];
    $FileLang = $_POST['FileLang'];

    // Remove \
    $FileContent = stripslashes($_POST['FileContent']);

    // Replace &nbsp; by space
    $FileContent = str_replace("&nbsp;", "", $FileContent);

    // Detect encoding
    $charset = $phpDoc->getFileEncoding($FileContent, 'content');

    // If the new charset is set to utf-8, we don't need to decode it
    if ($charset != 'utf-8') {
        // Utf8_decode
        $FileContent = utf8_decode($FileContent);
    }

    // Get EN content to check error with
    $dirEN = $phpDoc->cvsDoc.'en'.$FilePath;
    $en_content = file_get_contents($dirEN.$FileName);

    // Do tools_error
    //$error = $phpDoc->tools_error_check_all($fileContent, $en_content);

    // Update DB with this new Error (if any)
    $anode[0] = Array( 0 => $FilePath, 1 => $FileName, 2 => $FileLang);
    $r = $phpDoc->updateFilesError($anode, 'nocommit', $FileContent, $en_content);

    echo '{"success":true, "error":'.json_encode($r['state']).', "error_first":'.json_encode($r['first']).'}';
    exit;
}

// NEW
if ($task == 'save-file') {

    $phpDoc->isLogged();

    $filePath   = $_POST['filePath'];
    $fileName   = $_POST['fileName'];
    $fileLang   = $_POST['fileLang'];
    $type       = (isset($_POST['type'])) ? $_POST['type'] : 'file';
    $emailAlert = (isset($_POST['emailAlert'])) ? $_POST['emailAlert'] : '';


    if ($phpDoc->cvsLogin == 'cvsread' && $type == 'file') {
        echo '{"success":false}';
        exit;
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
    $fileContent = stripslashes($_POST['fileContent']);

    // Replace &nbsp; by space
    $fileContent = str_replace("&nbsp;", "", $fileContent);

    // Detect encoding
    $charset = $phpDoc->getFileEncoding($fileContent, 'content');

    // If the new charset is set to utf-8, we don't need to decode it
    if ($charset != 'utf-8') {
        // Utf8_decode
        //$fileContent = utf8_decode($fileContent);
        $fileContent = iconv("UTF-8", $charset, $fileContent);
    }

    // Get revision
    $info = $phpDoc->getInfoFromContent($fileContent);

    if ($type == 'file') {

        $phpDoc->saveFile($filePath.$fileName, $fileContent, $fileLang, 'file');
        $phpDoc->registerAsPendingCommit($fileLang, $filePath, $fileName, $info['rev'], $info['en-rev'], $info['reviewed'], $info['maintainer']);
        echo '{"success":true, "en_revision":'.$info['rev'].',"new_revision":'.$info['en-rev'].', "maintainer":"'.$info['maintainer'].'", "reviewed":"'.$info['reviewed'].'"}';
        exit;

    } else {
        $uniqID = $phpDoc->registerAsPendingPatch($fileLang, $filePath, $fileName, $emailAlert);
        $phpDoc->saveFile($filePath.$fileName, $fileContent, $fileLang, 'patch', $uniqID);
        echo '{"success":true, "uniqID":"'.$uniqID.'"}';
        exit;
    }

}

// NEW
if ($task == 'get-log') {

    $phpDoc->isLogged();
    $Path = $_POST['Path'];
    $File = $_POST['File'];

    $r = $phpDoc->cvsGetLog($Path, $File);
    echo '{"nbItems":'.count($r).', "Items":'.json_encode($r).'}';
    exit;
}

if ($task == 'get-diff') {

    $phpDoc->isLogged();
    $FilePath = $_POST['FilePath'];
    $FileName = $_POST['FileName'];
    $type     = ( isset($_POST['type']) ) ? $_POST['type'] : '';
    $uniqID   = ( isset($_POST['uniqID']) ) ? $_POST['uniqID'] : '';

    $info = $phpDoc->getDiffFromFiles($FilePath, $FileName, $type, $uniqID);
    echo '{"success":true, "content":'.json_encode($info['content']).', "encoding":'.json_encode($info['charset']).'}';
    exit;

}

//NEW
if ($task == 'get-diff2') {

    $phpDoc->isLogged();
    $FilePath = $_POST['FilePath'];
    $FileName = $_POST['FileName'];
    $Rev1 = $_POST['Rev1'];
    $Rev2 = $_POST['Rev2'];

    $r = $phpDoc->getDiffFromExec($FilePath, $FileName, $Rev1, $Rev2);
    echo '{"success":true, "content":'.json_encode($r).'}';
    exit;

}

if ($task == 'erase-personal-data') {

    $phpDoc->isLogged();

    if ($phpDoc->cvsLogin == 'cvsread') {
        echo '{"success":false}';
        exit;
    }

    $phpDoc->erasePersonalData();
    echo '{"success":true}';
    exit;

}

if ($task == 'get-commit-log-message') {

    $phpDoc->isLogged();
    $r = $phpDoc->getCommitLogMessage();
    echo '{"nbItems":'.count($r).', "Items":'.json_encode($r).'}';
    exit;
}

if ($task == 'update-single-file') {

    $file = $_POST['file'];
    $path = $_POST['path'];

    $phpDoc->isLogged();
    // Reel Update EN
    $phpDoc->cvsUpdateSingleFile($file, $path);
    // Reel Update Lang
    $phpDoc->cvsUpdateSingleFile($file, $path, 'lang');

    // Do revcheck for just this file
    $phpDoc->rev_on_oneFile($file, $path);

    // Need return EN_revision for translated file and revision of EN file

}



//NEW
if ($task == 'clear-local-change') {
    $phpDoc->isLogged();

    if ($phpDoc->cvsLogin == 'cvsread') {
        echo '{"success":false}';
        exit;
    }

    $FilePath = $_POST['FilePath'];
    $FileName = $_POST['FileName'];

    $info = $phpDoc->clearLocalChange($FilePath, $FileName);

    echo '{"success":true, "revision":"'.$info['rev'].'", "maintainer":"'.$info['maintainer'].'", "error": "'.$info['errorFirst'].'", "reviewed": "'.$info['reviewed'].'"}';
    exit;
}

if ($task == 'get-logfile') {

    $phpDoc->isLogged();

    $file = $_POST['file'];

    $content = $phpDoc->getOutputLogFile($file);

    echo '{"success":true, "mess":'.json_encode($content).'}';
    exit;

}
if ($task == 'check-build') {

    $phpDoc->isLogged();

    if ($phpDoc->cvsLogin == 'cvsread') {
        echo '{"success":false}';
        exit;
    }

    $xmlDetails = $_POST['xmlDetails'];

    // Set the lock File
    $phpDoc->lockFileSet('lock_check_build');

    // Start the checkBuild system
    $output = $phpDoc->checkBuild($xmlDetails);

    // Remove the lock File
    $phpDoc->lockFileRemove('lock_check_build');

    // Send output into a log file
    $phpDoc->saveOutputLogFile('log_check_build', $output);

    echo '{"success":true}';
    exit;
}

if ($task == 'cvs-commit') {
    $phpDoc->isLogged();

    if ($phpDoc->cvsLogin == 'cvsread') {
        echo '{"success":false}';
        exit;
    }

    $nodes = $_POST['nodes'];
    $logMessage = stripslashes($_POST['logMessage']);

    $anode = json_decode(stripslashes($nodes));

    $r = $phpDoc->cvsCommit($anode, $logMessage);

    echo '{"success":true, "mess":'.json_encode($r).'}';
    exit;
}

if ($task == 'on-succes-commit') {

    $phpDoc->isLogged();

    if ($phpDoc->cvsLogin == 'cvsread') {
        echo '{"success":false}';
        exit;
    }

    $nodes = $_POST['nodes'];
    $logMessage = stripslashes($_POST['logMessage']);

    $anode = json_decode(stripslashes($nodes));

    // Update revision & reviewed for all this files
    $phpDoc->updateRev($anode);

    // Update FilesError for all this files
    $phpDoc->updateFilesError($anode);

    // Remove all this files in needcommit
    $phpDoc->removeNeedCommit($anode);

    // Manage this logMessage
    $phpDoc->manageLogMessage($logMessage);

    echo '{"success":true}';
    exit;

}

if ($task == 'get-conf') {

    $phpDoc->isLogged();
    $r['userLang'] = $phpDoc->cvsLang;
    $r['userLogin'] = $phpDoc->cvsLogin;
    $r['userConf'] = $phpDoc->userConf;
    echo '{"success":true, "mess":'.json_encode($r).'}';
    exit;

}

if ($task == 'send-email') {

    $phpDoc->isLogged();

    $to      = $_POST['to'];
    $subject = $_POST['subject'];
    $msg     = $_POST['msg'];
    $phpDoc->sendEmail($to, $subject, $msg);
    echo '{"success":true}';
    exit;
}

if ($task == 'conf-update') {

    $phpDoc->isLogged();

    $item      = $_POST['item'];
    $value     = $_POST['value'];

    $r = $phpDoc->updateConf($item, $value);
    echo '{"success":true, "msg":'.json_encode($r).'}';
    exit;
}

if ($task == 'getAllFiles') {

    $phpDoc->isLogged();

    $node  = $_POST['node'];

    $files = $phpDoc->getAllFiles($node);

    echo json_encode($files);
    exit;
}

if ($task == 'save-LogMessage') {

    $phpDoc->isLogged();

    if ($phpDoc->cvsLogin == 'cvsread') {
        echo '{"success":false}';
        exit;
    }

    $messID = $_POST['messID'];
    $mess   = stripslashes($_POST['mess']);

    $phpDoc->saveLogMessage($messID, $mess);

    echo '{"success":true}';
    exit;
}

if ($task == 'delete-LogMessage') {

    $phpDoc->isLogged();

    if ($phpDoc->cvsLogin == 'cvsread') {
        echo '{"success":false}';
        exit;
    }

    $messID = $_POST['messID'];

    $phpDoc->deleteLogMessage($messID);

    echo '{"success":true}';
    exit;
}

if ($task == 'all-files-about-extension') {

    $phpDoc->isLogged();

    $ExtName = $_POST['ExtName'];

    $r = $phpDoc->allFilesExtension($ExtName);

    echo '{"success":true, "files":'.json_encode($r).'}';
    exit;
}

if ($task == 'after-patch-accept') {

    $phpDoc->isLogged();

    $PatchUniqID = $_POST['PatchUniqID'];

    $phpDoc->afterPatchAccept($PatchUniqID);

    echo '{"success":true}';
    exit;
}

if ($task == 'after-patch-reject') {

    $phpDoc->isLogged();

    if ($phpDoc->cvsLogin == 'cvsread') {
        echo '{"success":false}';
        exit;
    }

    $PatchUniqID = $_POST['PatchUniqID'];

    $phpDoc->afterPatchReject($PatchUniqID);

    echo '{"success":true}';
    exit;
}

if ($task == 'get-check-doc-data') {

    $phpDoc->isLogged();

    $r = $phpDoc->get_Check_Doc_Data();

    echo '{"nbItems":'.$r['nb'].', "Items":'.json_encode($r['node']).'}';
    exit;
}

if ($task == 'get-check-doc-files') {

    $phpDoc->isLogged();

    $path      = $_POST['path'];
    $errorType = $_POST['errorType'];

    $r = $phpDoc->get_Check_Doc_Files($path, $errorType);

    echo '{"success":true, "files":'.json_encode($r).'}';
    exit;
}

echo '{"success":false}';
exit;