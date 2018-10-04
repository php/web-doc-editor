# Installation instructions

## Requirements
* PHP 5.2.1+
* The MySQLi extension
* The cURL extension
* Shell exec privileges
* native vcs-client (e.g. using Subversion should have native svn-client)
* Php mail function must be activate
* Apache mod-rewrite module

## Configuration
* Configuration is set in php/conf/

## File structure
* Clone of the GIT repository copy named doc-editor.git
  - git clone https://git.php.net/repository/web/doc-editor.git doc-editor (for readonly access)
  - git clone git@git.php.net:/web/doc-editor.git doc-editor (for write access)

* Make sure the data directory has read/write permissions for the web server user
  - Default data directory location: doc-editor/data

## The Database
* Create a MySQL database as per php/conf/conf.ini
* Import install/doc-editor.sql into this new database
* Setup configuration options for each project inside php/conf/project.XXX.ini (php/conf/project.php.ini for the php project, php/conf/project.pear.ini for the pear project, etc.)

## Initial (first) run
* Execute install/firstRun.php either in the browser or via CLI
  It will take a long time to execute, as it performs the following duties, for each project:
  - Applies tools such as revcheck, doc_check, and error_check
  - Checks out the phpdoc-all VCS module into the data directory

## Other notes
* Anonymous authentication : anonymous with blank password
* Or use your own SVN credentials
* After modifying any .js, run scripts/utils/compress.sh, you need yui-compressor-2.4.2+
  The script will look for scripts/utils/yuicompressor.jar
