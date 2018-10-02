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

    /**
     * Write into the lock
     *
     * @return boolean Returns TRUE if the write is OK, or FALSE otherwise
     */
    function writeIntoLock($text)
    {
        if( $this->isLocked() )
        {
            $handle = fopen($this->path, 'w');

            if (fwrite($handle, $text) === FALSE) {
                return false;
            } else {
                return true;
            }
        } else {
            return false;
        }

    }

    /**
     * Read the lock
     *
     * @return The content of the lock or FALSE if the lock didn't exist
     */
    function readLock()
    {
        if( $this->isLocked() )
        {
            $handle = fopen($this->path, 'r');
            return fread($handle, filesize($this->path));
        } else
        {
            return false;
        }

    }

}
?>
