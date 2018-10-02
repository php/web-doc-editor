<?php

require_once dirname(__FILE__) . '/SaferExec.php';

class PreviewFile
{
    public $path;
    public $previewUrl;

    private $am;
    private $outputDir;
    private $inputDir;
    private $buildCmd;

    private $fullPath;
    private $fullNewPath;

    /**
     */
    public function __construct($path)
    {
        $this->am = AccountManager::getInstance();

        // Only available for PHP project
        if( $this->am->project != 'PHP' ) {
            return false;
        }

        $this->path = str_replace('..', '', $path);

        $this->checkPath();
        $this->makePreview();

    }

    private function checkPath()
    {
        $appConf = $this->am->appConf;
        $project = $this->am->project;

        $this->fullPath = $appConf['GLOBAL_CONFIGURATION']['data.path'].$appConf[$project]['vcs.module'].'/'.$this->path;
        $this->fullNewPath = $appConf['GLOBAL_CONFIGURATION']['data.path'].$appConf[$project]['vcs.module'].'-new/'.$this->path;

    }

    private function checkDir()
    {
        // Output
        $this->outputDir = $this->am->appConf['GLOBAL_CONFIGURATION']['data.path'].$this->am->appConf[$this->am->project]['vcs.module'].'-new/output-'.md5($this->am->vcsLogin).'/';
        if( !is_dir($this->outputDir) ) {
            mkdir($this->outputDir);
        }

        // Input
        $this->inputDir = $this->am->appConf[$this->am->project]['preview.baseURI.path'].'manual/en/';
        if( !is_dir($this->inputDir) ) {
            mkdir($this->am->appConf[$this->am->project]['preview.baseURI.path'].'manual');
            mkdir($this->inputDir);
        }
    }

    /**
     */
    private function makePreview()
    {
        $appConf = $this->am->appConf;
        $project = $this->am->project;

        $this->checkDir();

        // We clean the input output directory
        $commands = array(
            new ExecStatement('cd %s', array($this->outputDir)),
            new ExecStatement('rm -R *')
        );
        SaferExec::execMulti($commands, $output);
        $this->cleanCmd = implode('; ', $commands);
        $this->cleanLog = $output;

        $rename = 0;
        $t = time();
        // We are editing temporary file
        if( file_exists($this->fullNewPath) ) {
            $rename = 1;
            rename($this->fullPath, $this->fullPath . $t);
            rename($this->fullNewPath, $this->fullPath);
        }

        // We start the build for this file
        $commands = array(
            new ExecStatement('cd %s', array($appConf[$project]['vcs.path'])),
            new ExecStatement($appConf['GLOBAL_CONFIGURATION']['php.bin'] . ' doc-base/configure.php --with-php=%s --generate=%s', array($appConf['GLOBAL_CONFIGURATION']['php.bin'], $this->path)),
            new ExecStatement($appConf['GLOBAL_CONFIGURATION']['phd.bin'] . ' --package PHP --format php --memoryindex -d doc-base/.manual.xml --output %s', array($this->outputDir))
        );

        SaferExec::execMulti($commands, $output);
        $this->buildCmd = implode('; ', $commands);
        $this->buildLog = $output;

        // Rename it back
        if ($rename) {
            rename($this->fullPath, $this->fullNewPath);
            rename($this->fullPath . $t, $this->fullPath);
        }

        // Only move the specific file we are generating
        $xmlID = $this->getOutputId();
        $filename = 'phdoe-' . time() . '-' . $xmlID. '.php';
        $cmd = new ExecStatement('mv %s %s', array($this->outputDir . 'php-web/' . $xmlID . '.php', $this->inputDir . $filename));
        SaferExec::exec($cmd, $output);
        $this->moveCmd = $cmd->__toString();
        $this->moveLog = $output;


        $this->previewUrl = $this->am->appConf[$this->am->project]['preview.baseURI'].'manual/en/' . $filename;

    }

    private function getOutputId()
    {
        // The output file name is the first ID of the file
        $file = explode('/', $this->path);
        $lang = $file[0];
        array_shift($file);
        $path = implode('/',$file);

        $fileInfo = new File($lang, $path);
        $info = $fileInfo->getInfo();

        $xmlIDs = explode('|',$info['xmlid']);
        $xmlID = $xmlIDs[0];
        return $xmlID;
    }

    public function getPreviewUrl() {
        return $this->previewUrl;
    }

    public function getBuildCmd() {
        return $this->buildCmd;
    }

}

?>
