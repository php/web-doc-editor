<?php
/**
 * A class for locking tasks
 *
 */
class lockFile {
    
    /**
     * Lock file identifier
     *
     * @var string
     */
    private $id;
    
    /**
     * Initialise the lock file
     *
     * @param string $id
     */
    function __construct($id)
    {
        $this->id   = $id;
        $this->path = $GLOBALS['DOC_EDITOR_DATA_PATH'] . '.' . preg_replace('![^0-9a-z.]!i', '', $this->id);
    }
    
    /**
     * Tells if the lock file exists
     * 
     * @return bool Returns TRUE if the file exists, FALSE otherwise
     */
    function isLocked()
    {
        return file_exists($this->path);
    }
    
    /**
     * Sets the lock file
     *
     * @return bool Returns TRUE if the lock was successfully set, FALSE otherwise
     */
    function lock() 
    {
        if ($this->isLocked()) {
echo "HERE !!!!!\n";
            return false;
        }
        return touch($this->path);
    }
    
    /**
     * Release the lock
     *
     * return bool Returns TRUE if the lock was released, FALSE otherwise
     */
    function release() 
    {
        if ($this->isLocked()) {
            return unlink($this->path);
        }
        return true;
    }
    
}