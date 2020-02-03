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
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

--
-- Structure of table `staticValue`
--

CREATE TABLE IF NOT EXISTS `staticValue` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL,
  `field` varchar(50) NOT NULL,
  `value` LONGTEXT NOT NULL,
  `date` datetime NOT NULL,
  KEY `id` (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Structure of table `commitMessage`
--

CREATE TABLE IF NOT EXISTS `commitMessage` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) NOT NULL,
  `text` text NOT NULL,
  `user` varchar(255) NOT NULL,
  `used` int(11) NOT NULL DEFAULT '0',
  KEY `id` (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

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
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Structure of table `files`
--

CREATE TABLE IF NOT EXISTS `files` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) NOT NULL,
  `lang` varchar(10) NOT NULL,
  `xmlid` text,
  `path` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `revision` int(11) unsigned DEFAULT NULL,
  `en_revision` int(11) unsigned DEFAULT NULL,
  `reviewed` varchar(20) DEFAULT NULL,
  `reviewed_maintainer` text,
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
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

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
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Structure of table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `userID` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) NOT NULL,
  `authService` varchar(255) NOT NULL DEFAULT 'VCS',
  `authServiceID` text NOT NULL,
  `vcs_login` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `anonymousIdent` varchar(255) NOT NULL,
  `conf` text NOT NULL,
  `last_connect` datetime NOT NULL,
  KEY `userID` (`userID`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

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
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Structure of table `dictionary`
--

CREATE TABLE IF NOT EXISTS `dictionary` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) NOT NULL,
  `lang` varchar(10) NOT NULL,
  `valueEn` varchar(255) NOT NULL,
  `valueLang` varchar(255) NOT NULL,
  `lastUser` varchar(255) NOT NULL,
  `lastDate` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

-- --------------------------------------------------------

--
-- Structure of table `userNotes`
--

CREATE TABLE IF NOT EXISTS `userNotes` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) NOT NULL,
  `file` varchar(255) NOT NULL,
  `note` text NOT NULL,
  `user` varchar(50) NOT NULL,
  `date` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;


-- --------------------------------------------------------

--
-- Structure of table `work`
--

CREATE TABLE IF NOT EXISTS `work` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `userID` int(10) unsigned NOT NULL,
  `project` varchar(255) NOT NULL,
  `lang` varchar(10) NOT NULL,
  `path` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `revision` int(11) NOT NULL,
  `en_revision` int(11) NOT NULL,
  `reviewed` varchar(50) NOT NULL,
  `maintainer` varchar(255) NOT NULL,
  `reviewed_maintainer` varchar(255) NOT NULL,
  `date` datetime NOT NULL,
  `type` enum('new','delete','update','patch') NOT NULL,
  `progress` smallint(6) unsigned DEFAULT '100',
  `module` enum('workInProgress','PatchesForReview') NOT NULL,
  `patchID` int(11) DEFAULT NULL,
  KEY `id` (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

--
-- Structure of table `patches`
--

CREATE TABLE IF NOT EXISTS `patches` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `userID` int(10) unsigned NOT NULL,
  `project` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `email` varchar(255) DEFAULT NULL,
  `date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

--
-- Structure of table `usageStatistics`
--

CREATE TABLE IF NOT EXISTS `usageStatistics` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `project` varchar(255) CHARACTER SET utf8 NOT NULL,
  `type` varchar(50) CHARACTER SET utf8 NOT NULL,
  `subType` varchar(50) CHARACTER SET utf8 NOT NULL,
  `value` bigint(20) unsigned DEFAULT NULL,
  `yearMonth` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB  DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;
