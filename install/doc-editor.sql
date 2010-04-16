SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";


--
-- Database: `doc-editor`
--

-- --------------------------------------------------------

--
-- Structure of table `checkEntities`
--

CREATE TABLE IF NOT EXISTS `checkEntities` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) NOT NULL,
  `entities` varchar(255) NOT NULL,
  `url` varchar(255) NOT NULL,
  `result` varchar(50) NOT NULL,
  `date` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `id` (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

--
-- Structure of table `staticValue`
--

CREATE TABLE IF NOT EXISTS `staticValue` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL,
  `field` varchar(50) NOT NULL,
  `value` text NOT NULL,
  `date` datetime NOT NULL,
  KEY `id` (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Structure of table `commitMessage`
--

CREATE TABLE IF NOT EXISTS `commitMessage` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) NOT NULL,
  `text` text NOT NULL,
  `userID` int(10) unsigned NOT NULL,
  KEY `id` (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Structure of table `errorfiles`
--

CREATE TABLE IF NOT EXISTS `errorfiles` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) NOT NULL,
  `lang` varchar(10) NOT NULL,
  `path` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `maintainer` varchar(255) DEFAULT NULL,
  `value_en` varchar(255) NOT NULL,
  `value_lang` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  KEY `id` (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Structure of table `files`
--

CREATE TABLE IF NOT EXISTS `files` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) NOT NULL,
  `lang` varchar(10) NOT NULL,
  `xmlid` varchar(255) DEFAULT NULL,
  `path` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `revision` int(11) unsigned DEFAULT NULL,
  `en_revision` int(11) unsigned DEFAULT NULL,
  `reviewed` varchar(20) DEFAULT NULL,
  `size` int(11) unsigned DEFAULT NULL,
  `size_diff` int(11) DEFAULT NULL,
  `mdate` bigint(20) unsigned DEFAULT NULL,
  `mdate_diff` int(11) DEFAULT NULL,
  `maintainer` text,
  `status` text,
  `check_oldstyle` int(11) DEFAULT NULL,
  `check_undoc` int(11) DEFAULT NULL,
  `check_roleerror` int(11) DEFAULT NULL,
  `check_badorder` int(11) DEFAULT NULL,
  `check_noseealso` int(11) DEFAULT NULL,
  `check_noreturnvalues` int(11) DEFAULT NULL,
  `check_noparameters` int(11) DEFAULT NULL,
  `check_noexamples` int(11) DEFAULT NULL,
  `check_noerrors` int(11) DEFAULT NULL,
  KEY `id` (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Structure of table `pendingCommit`
--

CREATE TABLE IF NOT EXISTS `pendingCommit` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) NOT NULL,
  `lang` varchar(10) NOT NULL,
  `path` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `revision` int(11) NOT NULL,
  `en_revision` int(11) NOT NULL,
  `reviewed` varchar(50) NOT NULL,
  `maintainer` varchar(255) NOT NULL,
  `modified_by` varchar(50) NOT NULL,
  `date` datetime NOT NULL,
  `type` enum('new','delete','update') NOT NULL,
  KEY `id` (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Structure of table `pendingPatch`
--

CREATE TABLE IF NOT EXISTS `pendingPatch` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) NOT NULL,
  `lang` varchar(10) NOT NULL,
  `path` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `posted_by` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `uniqID` varchar(255) NOT NULL,
  `date` datetime NOT NULL,
  KEY `id` (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Structure of table `translators`
--

CREATE TABLE IF NOT EXISTS `translators` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) NOT NULL,
  `lang` varchar(255) NOT NULL,
  `nick` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `mail` varchar(255) NOT NULL,
  `vcs` varchar(255) NOT NULL,
  `editor` varchar(255) NOT NULL,
  KEY `id` (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Structure of table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `userID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `vcs_login` varchar(255) NOT NULL,
  `conf` text NOT NULL,
  `last_connect` datetime NOT NULL,
  KEY `userID` (`userID`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Structure of table `failedBuildLog`
--
CREATE TABLE IF NOT EXISTS `failedBuildLog` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(50) NOT NULL,
  `lang` varchar(10) NOT NULL,
  `log` mediumtext NOT NULL,
  `date` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Structure of table `dictionnary`
--

CREATE TABLE IF NOT EXISTS `dictionnary` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) NOT NULL,
  `lang` varchar(10) NOT NULL,
  `valueEn` int(255) NOT NULL,
  `valueLang` int(255) NOT NULL,
  `lastUser` varchar(255) NOT NULL,
  `lastDate` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;
