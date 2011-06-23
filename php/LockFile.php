<?php
/**
 * A class for file's locking tasks. DONE.
 *
 */
class lockFile
{
    
    /**
     * Lock file identifier
     *
     * @var string
     */
    private $id;
    
    /**
     * Initialise the lock file
     *
     * @param string $id The lock identifier
     */
    function __construct($id)
    {
        $am = AccountManager::getInstance();
        $appConf = $am->appConf;

        // For security, we don't want to have IDs that can traverse directories.
        $id = basename($id);

        $this->id   = $id;
        $this->path = $appConf['GLOBAL_CONFIGURATION']['data.path'] . '.' . $this->id;
    }
    
    /**
     * Tells if the lock file exists
     * 
     * @return boolean Returns TRUE if the file exists, FALSE otherwise
     */
    function isLocked()
    {
        return file_exists($this->path);
    }
    
    /**
     * Sets the lock file
     *
     * @return boolean Returns TRUE if the lock was successfully set, FALSE otherwise
     */
    function lock() 
    {
        if ($this->isLocked()) {
            return false;
        }
        return touch($this->path);
    }
    
    /**
     * Release the lock
     *
     * @return boolean Returns TRUE if the lock was released, FALSE otherwise
     */
    function release() 
    {
        if ($this->isLocked()) {
            return unlink($this->path);
        }
        return true;
    }
    
}
?>
