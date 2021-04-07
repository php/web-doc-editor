<?php
error_reporting( E_ALL | E_NOTICE | E_STRICT );
ini_set( "display_errors" , 1 );

require_once dirname(__FILE__) . '/php/File.php';
require_once dirname(__FILE__) . '/php/ProjectManager.php';
require_once dirname(__FILE__) . '/php/RepositoryFetcher.php';

$req_proj = $_REQUEST['project'];
$req_lang = $_REQUEST['lang'];
$req_iddb = $_REQUEST['idDB'];

ProjectManager::getInstance()->setProject( $req_proj );

$data = RepositoryFetcher::getInstance()->getRawWork( $req_lang );

for( $i = 0 ; $i < count( $data['PatchesForReview']['data'] ) ; $i++ )
{
    $item = $data['PatchesForReview']['data'][$i];

    if ( $item['idDB'] != $req_iddb ) continue;

    $file = new File( $item['fileLang'] , $item['filePath'] . $item['fileName'] );
    $diff = $file->diff();
    $diff = implode( "\n" , $diff );

    print $diff;
    exit;
}

print "No patch found. project:$req_proj lang:$req_lang idDB:$req_iddb\n";

