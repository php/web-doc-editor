<?php
session_start();
include "./class.php";

include '../jpgraph/src/jpgraph.php';
include '../jpgraph/src/jpgraph_pie.php';
include '../jpgraph/src/jpgraph_pie3d.php';

$phpDoc = new phpDoc();
$phpDoc->isLogged();

$Total_files_lang = $phpDoc->get_nb_files();
//
$up_to_date = $phpDoc->get_nb_files_Translated();
$up_to_date = $up_to_date[0];
//
$critical = $phpDoc->get_stats_critical();
$critical = $critical[0];
//
$old = $phpDoc->get_stats_old();
$old = $old[0];
//
$missing = sizeof($phpDoc->get_missfiles());
//
$no_tag = $phpDoc->get_stats_notag();
$no_tag = $no_tag[0];
//
$data = array($up_to_date,$critical,$old,$missing,$no_tag);
$pourcent = array();
$total = 0;
$total = array_sum($data);

foreach ( $data as $valeur ) {
    $pourcent[] = round($valeur * 100 / $total);
}

$noExplode = ($Total_files_lang == $up_to_date) ? 1 : 0;

$legend = array($pourcent[0] . '%% up to date ('.$up_to_date.')', $pourcent[1] . '%% critical ('.$critical.')', $pourcent[2] . '%% old ('.$old.')', $pourcent[3] . '%% missing ('.$missing.')', $pourcent[4] . '%% without revtag ('.$no_tag.')');
$title = 'PHP : Details for '.ucfirst($phpDoc->cvsLang).' Documentation';

$graph = new PieGraph(530,300);
//$graph->SetShadow();

$graph->title->Set($title);
$graph->title->Align('left');
$graph->title->SetFont(FF_FONT1,FS_BOLD);

$graph->legend->Pos(0.02,0.18,"right","center");

$graph->subtitle->Set('(Total: '.$Total_files_lang.' files)');
$graph->subtitle->Align('left');
$graph->subtitle->SetColor('darkred');

$t1 = new Text(date('m/d/Y'));
$t1->SetPos(522,294);
$t1->SetFont(FF_FONT1,FS_NORMAL);
$t1->Align("right", 'bottom');
$t1->SetColor("black");
$graph->AddText($t1);

$p1 = new PiePlot3D($data);
$p1->SetSliceColors(array("#68d888", "#ff6347", "#eee8aa", "#dcdcdc", "#f4a460"));
if ($noExplode != 1) {
    $p1->ExplodeAll();
}
$p1->SetCenter(0.35,0.55);
$p1->value->Show(false);

$p1->SetLegends($legend);

$graph->Add($p1);
$graph->Stroke();
