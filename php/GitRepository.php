<?php

require_once __DIR__.'/../vendor/autoload.php';

class GitRepository extends \Cz\Git\GitRepository
{
    protected $ignoredCommits = [
        // XML Formatting commits
        '8d666e819852f6b0561b40fcf8689b747568865c',
        // vrana's mass commit
        '69bd53265b6c8cf0ba4135142488de6dcb78e4eb',
        // the revert commit
        '4754397753fd79f1c846868b66a2448babab1c54',
    ];

    public function getLastFileCommitId($path)
    {
        $hashes = [];
        $this->begin();
        exec('git log -n 5 --pretty=format:%H -- ' . $path, $hashes);
        $this->end();

        foreach ($hashes as $hash) {
            if (in_array($hash, $this->ignoredCommits, true) || !preg_match('/^[0-9a-f]{40}$/i', $hash)) {
                continue;
            }

            return $hash;
        }

        return null;
    }
}
