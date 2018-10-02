<?php

require_once dirname(__FILE__) . '/../../php/DBConnection.php';

$nowDate = new DateTime();

$year = (isset($_GET['d']) ? (integer) $_GET['d'] : $nowDate->format('Y'));

$db = DBConnection::getInstance();

$s = "select * from staticValue WHERE type='info' and YEAR(`date`)='".$year."'";
$r = $db->query($s, array());

$info = array(
    "nbCon"=> array(
        "total" => 0,
        "authService" => array(
                "VCS" => 0,
                "google" => 0,
                "facebook" => 0,
                "github" => 0,
                "instagram" => 0,
                "stackoverflow" => 0,
                "linkedin" => 0
            )
        ),
    "byMonth"=>Array()
    );

$availableLang = Array();
$availableUser = Array();

while( $a = $r->fetch_object()) {

    $month = date("m", strtotime($a->date));
    $year = date("Y", strtotime($a->date));

    // pour les connexions
    if( $a->field == "login" ) {

        $tmp = json_decode($a->value);
        $info["nbCon"]["authService"][$tmp->authService] ++;
        $info["nbCon"]["total"] ++;

        $info["byMonth"][$month]['dataCon']['raw'][] = $a;

        $info["byMonth"][$month]['nbCon'] ++;

        $i = json_decode($a->value);

        $info["byMonth"][$month]['dataCon']['perLang'][$i->lang] ++;
        $info["byMonth"][$month]['dataCon']['perUser'][$i->user] ++;

        $availableLang[$i->lang] = 1;
        $availableUser[$i->user] = 1;
    }

    // pour les commit
    if( $a->field == "commitFiles" ) {
        $i = json_decode($a->value);
        $info["byMonth"][$month]['dataCommit']['raw'][] = $i;

        $info['nbFilesCreate'] += $i->nbFilesCreate;
        $info['nbFilesDelete'] += $i->nbFilesDelete;
        $info['nbFilesUpdate'] += $i->nbFilesUpdate;

        $info["byMonth"][$month]['dataCommit']['nbFilesCreate']['total'] += $i->nbFilesCreate;
        $info["byMonth"][$month]['dataCommit']['nbFilesDelete']['total'] += $i->nbFilesDelete;
        $info["byMonth"][$month]['dataCommit']['nbFilesUpdate']['total'] += $i->nbFilesUpdate;

        $info["byMonth"][$month]['dataCommit']['nbFilesCreate']['perLang'][$i->lang] += $i->nbFilesCreate;
        $info["byMonth"][$month]['dataCommit']['nbFilesDelete']['perLang'][$i->lang] += $i->nbFilesDelete;
        $info["byMonth"][$month]['dataCommit']['nbFilesUpdate']['perLang'][$i->lang] += $i->nbFilesUpdate;

        $info["byMonth"][$month]['dataCommit']['nbFilesCreate']['perUser'][$i->user] += $i->nbFilesCreate;
        $info["byMonth"][$month]['dataCommit']['nbFilesDelete']['perUser'][$i->user] += $i->nbFilesDelete;
        $info["byMonth"][$month]['dataCommit']['nbFilesUpdate']['perUser'][$i->user] += $i->nbFilesUpdate;

        $availableLang[$i->lang] = 1;
        $availableUser[$i->user] = 1;
    }


}

echo "<h1 style=\"text-align: center\">Year : ".$year."</h1>";
echo '<div id="top">';

for( $i=2010; $i <= $nowDate->format('Y'); $i++ ) {

    echo '<a href="?d='.$i.'">'.$i.'</a>';
    if( $i != $nowDate->format('Y') ) echo ' - ';
}

//<a href="?d=2010">2010</a> - <a href="?d=2011">2011</a> - <a href="?d=2012">2012</a>

echo '</div>';
echo "<h1>All language</h1>";
echo "<table border=1>";
echo "<tr>";
    echo "<th></th>";
    echo "<th>Janvier</th>";
    echo "<th>Fevrier</th>";
    echo "<th>Mars</th>";
    echo "<th>Avril</th>";
    echo "<th>Mai</th>";
    echo "<th>Juin</th>";
    echo "<th>Juillet</th>";
    echo "<th>Aout</th>";
    echo "<th>Septembre</th>";
    echo "<th>Octobre</th>";
    echo "<th>Novembre</th>";
    echo "<th>Decembre</th>";
    echo "<th>=&gt;Total</th>";
echo "</tr>";

//
echo "<tr>";
    echo "<td>Nb connexion</td>";
    echo "<td>".$info['byMonth']['01']['nbCon']."</td>";
    echo "<td>".$info['byMonth']['02']['nbCon']."</td>";
    echo "<td>".$info['byMonth']['03']['nbCon']."</td>";
    echo "<td>".$info['byMonth']['04']['nbCon']."</td>";
    echo "<td>".$info['byMonth']['05']['nbCon']."</td>";
    echo "<td>".$info['byMonth']['06']['nbCon']."</td>";
    echo "<td>".$info['byMonth']['07']['nbCon']."</td>";
    echo "<td>".$info['byMonth']['08']['nbCon']."</td>";
    echo "<td>".$info['byMonth']['09']['nbCon']."</td>";
    echo "<td>".$info['byMonth']['10']['nbCon']."</td>";
    echo "<td>".$info['byMonth']['11']['nbCon']."</td>";
    echo "<td>".$info['byMonth']['12']['nbCon']."</td>";
    echo "<td>".$info['nbCon']['total']."</td>";
echo "</tr>";

//
echo "<tr>";
    echo "<td>Nb CreateFile</td>";
    echo "<td>".$info['byMonth']['01']['dataCommit']['nbFilesCreate']['total']."</td>";
    echo "<td>".$info['byMonth']['02']['dataCommit']['nbFilesCreate']['total']."</td>";
    echo "<td>".$info['byMonth']['03']['dataCommit']['nbFilesCreate']['total']."</td>";
    echo "<td>".$info['byMonth']['04']['dataCommit']['nbFilesCreate']['total']."</td>";
    echo "<td>".$info['byMonth']['05']['dataCommit']['nbFilesCreate']['total']."</td>";
    echo "<td>".$info['byMonth']['06']['dataCommit']['nbFilesCreate']['total']."</td>";
    echo "<td>".$info['byMonth']['07']['dataCommit']['nbFilesCreate']['total']."</td>";
    echo "<td>".$info['byMonth']['08']['dataCommit']['nbFilesCreate']['total']."</td>";
    echo "<td>".$info['byMonth']['09']['dataCommit']['nbFilesCreate']['total']."</td>";
    echo "<td>".$info['byMonth']['10']['dataCommit']['nbFilesCreate']['total']."</td>";
    echo "<td>".$info['byMonth']['11']['dataCommit']['nbFilesCreate']['total']."</td>";
    echo "<td>".$info['byMonth']['12']['dataCommit']['nbFilesCreate']['total']."</td>";
    echo "<td>".$info['nbFilesCreate']."</td>";
echo "</tr>";
//
echo "<tr>";
    echo "<td>Nb nbFilesDelete</td>";
    echo "<td>".$info['byMonth']['01']['dataCommit']['nbFilesDelete']['total']."</td>";
    echo "<td>".$info['byMonth']['02']['dataCommit']['nbFilesDelete']['total']."</td>";
    echo "<td>".$info['byMonth']['03']['dataCommit']['nbFilesDelete']['total']."</td>";
    echo "<td>".$info['byMonth']['04']['dataCommit']['nbFilesDelete']['total']."</td>";
    echo "<td>".$info['byMonth']['05']['dataCommit']['nbFilesDelete']['total']."</td>";
    echo "<td>".$info['byMonth']['06']['dataCommit']['nbFilesDelete']['total']."</td>";
    echo "<td>".$info['byMonth']['07']['dataCommit']['nbFilesDelete']['total']."</td>";
    echo "<td>".$info['byMonth']['08']['dataCommit']['nbFilesDelete']['total']."</td>";
    echo "<td>".$info['byMonth']['09']['dataCommit']['nbFilesDelete']['total']."</td>";
    echo "<td>".$info['byMonth']['10']['dataCommit']['nbFilesDelete']['total']."</td>";
    echo "<td>".$info['byMonth']['11']['dataCommit']['nbFilesDelete']['total']."</td>";
    echo "<td>".$info['byMonth']['12']['dataCommit']['nbFilesDelete']['total']."</td>";
    echo "<td>".$info['nbFilesDelete']."</td>";
echo "</tr>";
//
echo "<tr>";
    echo "<td>Nb nbFilesUpdate</td>";
    echo "<td>".$info['byMonth']['01']['dataCommit']['nbFilesUpdate']['total']."</td>";
    echo "<td>".$info['byMonth']['02']['dataCommit']['nbFilesUpdate']['total']."</td>";
    echo "<td>".$info['byMonth']['03']['dataCommit']['nbFilesUpdate']['total']."</td>";
    echo "<td>".$info['byMonth']['04']['dataCommit']['nbFilesUpdate']['total']."</td>";
    echo "<td>".$info['byMonth']['05']['dataCommit']['nbFilesUpdate']['total']."</td>";
    echo "<td>".$info['byMonth']['06']['dataCommit']['nbFilesUpdate']['total']."</td>";
    echo "<td>".$info['byMonth']['07']['dataCommit']['nbFilesUpdate']['total']."</td>";
    echo "<td>".$info['byMonth']['08']['dataCommit']['nbFilesUpdate']['total']."</td>";
    echo "<td>".$info['byMonth']['09']['dataCommit']['nbFilesUpdate']['total']."</td>";
    echo "<td>".$info['byMonth']['10']['dataCommit']['nbFilesUpdate']['total']."</td>";
    echo "<td>".$info['byMonth']['11']['dataCommit']['nbFilesUpdate']['total']."</td>";
    echo "<td>".$info['byMonth']['12']['dataCommit']['nbFilesUpdate']['total']."</td>";
    echo "<td>".$info['nbFilesUpdate']."</td>";
echo "</tr>";


echo "</table>(Nb connexion per auth Service :

Google => ".$info["nbCon"]["authService"]["google"].";
Facebook => ".$info["nbCon"]["authService"]["facebook"].";
Github => ".$info["nbCon"]["authService"]["github"].";
Instagram => ".$info["nbCon"]["authService"]["instagram"].";
Stackoverflow => ".$info["nbCon"]["authService"]["stackoverflow"].";
Linkedin => ".$info["nbCon"]["authService"]["linkedin"].";
VCS => ".$info["nbCon"]["authService"]["VCS"].";

)<br>";

while( list($lang, $v) = each($availableLang)) {

    // Skip anonymous
    if( trim($lang) == '') continue;

    echo "<h1>Language : ".$lang." <a href=\"#top\" style=\"font-size:10px\">top</a></h1>";
    echo "<table border=1>";
    echo "<tr>";
        echo "<th></th>";
        echo "<th>Janvier</th>";
        echo "<th>Fevrier</th>";
        echo "<th>Mars</th>";
        echo "<th>Avril</th>";
        echo "<th>Mai</th>";
        echo "<th>Juin</th>";
        echo "<th>Juillet</th>";
        echo "<th>Aout</th>";
        echo "<th>Septembre</th>";
        echo "<th>Octobre</th>";
        echo "<th>Novembre</th>";
        echo "<th>Decembre</th>";
    echo "</tr>";

    //
    echo "<tr>";
        echo "<td>Nb connexion</td>";
        echo "<td>".$info['byMonth']['01']['dataCon']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['02']['dataCon']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['03']['dataCon']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['04']['dataCon']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['05']['dataCon']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['06']['dataCon']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['07']['dataCon']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['08']['dataCon']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['09']['dataCon']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['10']['dataCon']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['11']['dataCon']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['12']['dataCon']['perLang'][$lang]."</td>";
    echo "</tr>";

    //
    echo "<tr>";
        echo "<td>Nb CreateFile</td>";
        echo "<td>".$info['byMonth']['01']['dataCommit']['nbFilesCreate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['02']['dataCommit']['nbFilesCreate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['03']['dataCommit']['nbFilesCreate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['04']['dataCommit']['nbFilesCreate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['05']['dataCommit']['nbFilesCreate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['06']['dataCommit']['nbFilesCreate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['07']['dataCommit']['nbFilesCreate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['08']['dataCommit']['nbFilesCreate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['09']['dataCommit']['nbFilesCreate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['10']['dataCommit']['nbFilesCreate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['11']['dataCommit']['nbFilesCreate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['12']['dataCommit']['nbFilesCreate']['perLang'][$lang]."</td>";
    echo "</tr>";
    //
    echo "<tr>";
        echo "<td>Nb nbFilesDelete</td>";
        echo "<td>".$info['byMonth']['01']['dataCommit']['nbFilesDelete']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['02']['dataCommit']['nbFilesDelete']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['03']['dataCommit']['nbFilesDelete']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['04']['dataCommit']['nbFilesDelete']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['05']['dataCommit']['nbFilesDelete']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['06']['dataCommit']['nbFilesDelete']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['07']['dataCommit']['nbFilesDelete']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['08']['dataCommit']['nbFilesDelete']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['09']['dataCommit']['nbFilesDelete']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['10']['dataCommit']['nbFilesDelete']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['11']['dataCommit']['nbFilesDelete']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['12']['dataCommit']['nbFilesDelete']['perLang'][$lang]."</td>";
    echo "</tr>";
    //
    echo "<tr>";
        echo "<td>Nb nbFilesUpdate</td>";
        echo "<td>".$info['byMonth']['01']['dataCommit']['nbFilesUpdate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['02']['dataCommit']['nbFilesUpdate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['03']['dataCommit']['nbFilesUpdate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['04']['dataCommit']['nbFilesUpdate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['05']['dataCommit']['nbFilesUpdate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['06']['dataCommit']['nbFilesUpdate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['07']['dataCommit']['nbFilesUpdate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['08']['dataCommit']['nbFilesUpdate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['09']['dataCommit']['nbFilesUpdate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['10']['dataCommit']['nbFilesUpdate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['11']['dataCommit']['nbFilesUpdate']['perLang'][$lang]."</td>";
        echo "<td>".$info['byMonth']['12']['dataCommit']['nbFilesUpdate']['perLang'][$lang]."</td>";
    echo "</tr>";


    echo "</table>";

}



while( list($user, $v) = each($availableUser)) {

    // Skip anonymous
    if( substr($user, 0, 11) == 'anonymous #') continue;

    echo "<h1>User : ".utf8_decode($user)." <a href=\"#top\" style=\"font-size:10px\">top</a></h1>";
    echo "<table border=1>";
    echo "<tr>";
        echo "<th></th>";
        echo "<th>Janvier</th>";
        echo "<th>Fevrier</th>";
        echo "<th>Mars</th>";
        echo "<th>Avril</th>";
        echo "<th>Mai</th>";
        echo "<th>Juin</th>";
        echo "<th>Juillet</th>";
        echo "<th>Aout</th>";
        echo "<th>Septembre</th>";
        echo "<th>Octobre</th>";
        echo "<th>Novembre</th>";
        echo "<th>Decembre</th>";
    echo "</tr>";

    //
    echo "<tr>";
        echo "<td>Nb connexion</td>";
        echo "<td>".$info['byMonth']['01']['dataCon']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['02']['dataCon']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['03']['dataCon']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['04']['dataCon']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['05']['dataCon']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['06']['dataCon']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['07']['dataCon']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['08']['dataCon']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['09']['dataCon']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['10']['dataCon']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['11']['dataCon']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['12']['dataCon']['perUser'][$user]."</td>";
    echo "</tr>";

    //
    echo "<tr>";
        echo "<td>Nb CreateFile</td>";
        echo "<td>".$info['byMonth']['01']['dataCommit']['nbFilesCreate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['02']['dataCommit']['nbFilesCreate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['03']['dataCommit']['nbFilesCreate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['04']['dataCommit']['nbFilesCreate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['05']['dataCommit']['nbFilesCreate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['06']['dataCommit']['nbFilesCreate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['07']['dataCommit']['nbFilesCreate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['08']['dataCommit']['nbFilesCreate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['09']['dataCommit']['nbFilesCreate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['10']['dataCommit']['nbFilesCreate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['11']['dataCommit']['nbFilesCreate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['12']['dataCommit']['nbFilesCreate']['perUser'][$user]."</td>";
    echo "</tr>";
    //
    echo "<tr>";
        echo "<td>Nb nbFilesDelete</td>";
        echo "<td>".$info['byMonth']['01']['dataCommit']['nbFilesDelete']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['02']['dataCommit']['nbFilesDelete']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['03']['dataCommit']['nbFilesDelete']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['04']['dataCommit']['nbFilesDelete']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['05']['dataCommit']['nbFilesDelete']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['06']['dataCommit']['nbFilesDelete']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['07']['dataCommit']['nbFilesDelete']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['08']['dataCommit']['nbFilesDelete']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['09']['dataCommit']['nbFilesDelete']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['10']['dataCommit']['nbFilesDelete']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['11']['dataCommit']['nbFilesDelete']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['12']['dataCommit']['nbFilesDelete']['perUser'][$user]."</td>";
    echo "</tr>";
    //
    echo "<tr>";
        echo "<td>Nb nbFilesUpdate</td>";
        echo "<td>".$info['byMonth']['01']['dataCommit']['nbFilesUpdate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['02']['dataCommit']['nbFilesUpdate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['03']['dataCommit']['nbFilesUpdate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['04']['dataCommit']['nbFilesUpdate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['05']['dataCommit']['nbFilesUpdate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['06']['dataCommit']['nbFilesUpdate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['07']['dataCommit']['nbFilesUpdate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['08']['dataCommit']['nbFilesUpdate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['09']['dataCommit']['nbFilesUpdate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['10']['dataCommit']['nbFilesUpdate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['11']['dataCommit']['nbFilesUpdate']['perUser'][$user]."</td>";
        echo "<td>".$info['byMonth']['12']['dataCommit']['nbFilesUpdate']['perUser'][$user]."</td>";
    echo "</tr>";


    echo "</table>";

}
?>
