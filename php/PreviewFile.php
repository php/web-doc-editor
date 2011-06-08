<?php

class PreviewFile
{
    public $path;
    public $previewUrl;
    private $am;
    private $outputDir;
    private $inputDir;
    private $buildCmd;
    
    /**
     */
    public function __construct($path)
    {
        $this->am = AccountManager::getInstance();
        
        // Only available for PHP project
        if( $this->am->project != 'PHP' ) {
            return false;
        }
        
        $this->path = $path;
        
        $this->checkPath();
        $this->makePreview();
        
    }
    
    private function checkPath()
    {
        $appConf = $this->am->appConf;
        $project = $this->am->project;
        
        $this->fullPath = $appConf['GLOBAL_CONFIGURATION']['data.path'].$appConf[$project]['vcs.module'].'/'.$this->path;
        
    }
    
    private function checkDir()
    {
        // Output
        $this->outputDir = $this->am->appConf['GLOBAL_CONFIGURATION']['data.path'].$this->am->appConf[$this->am->project]['vcs.module'].'/output-'.$this->am->vcsLogin.'/';
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
        $cmd = 'rm -R '.$this->outputDir.'* ;';
        exec("$cmd", $output);
        $this->cleanCmd = $cmd;
        $this->cleanLog = $output;
        
        $rename = 0;
        $t = time();
        // We are editing temporary file
        if( file_exists($this->fullPath.'.new') ) {
            $rename = 1;
            rename($this->fullPath, $this->fullPath . $t);
            rename($this->fullPath .'.new', $this->fullPath);
        }
        
        // We start the build for this file
        $cmd = 'cd '.$appConf[$project]['vcs.path'].'; '.$appConf['GLOBAL_CONFIGURATION']['php.bin'].' doc-base/configure.php --generate='.$this->path.' ; '.$appConf['GLOBAL_CONFIGURATION']['php.bin'].' ../phd/render.php --package PHP --format php --memoryindex -d doc-base/.manual.xml --output '.$this->outputDir;
        exec("$cmd", $output);
        $this->buildCmd = $cmd;
        $this->buildLog = $output;

        // Rename it back
        if ($rename) {
            rename($this->fullPath, $this->fullPath . '.new');
            rename($this->fullPath . $t, $this->fullPath);
        }
        
        
        // Only move the specific file we are generating
        $xmlID = $this->getOutputId();
        $filename = 'phdoe-' . time() . '-' . $xmlID. '.php';
        $cmd = 'mv '.$this->outputDir.'php-web/'.$xmlID.'.php '.$this->inputDir. $filename;
        exec("$cmd", $output);
        $this->moveCmd = $cmd;
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
