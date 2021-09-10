<?php

require_once __DIR__.'/../vendor/autoload.php';

class GitRepository extends \Cz\Git\GitRepository
{
    public function getLastFileCommitId($path)
    {
        $hashes = [];
        $this->begin();
        exec('git log -n 5 --pretty=format:%H -- ' . $path, $hashes);
        $this->end();

        foreach ($hashes as $hash) {
            if (
                (strpos($this->getCommitMessage($hash), '[skip-revcheck]') !== false) ||
                !preg_match('/^[0-9a-f]{40}$/i', $hash)) {
                continue;
            }

            return $hash;
        }

        return null;
    }
}
