<?php

function asset_views_tables(){
	$tables['asset_node'] = array(
		'name' => 'asset_node',
		'join' => array(
			'left' => array(
				'table' => 'node',
				'field' => 'nid',
			),
			'right' => array(
				'field' => 'nid',
			),
		),
	);
	
	$tables['asset'] = array(
		'name' => 'asset',
		'join' => array(
			'left' => array(
				'table' => 'asset_node',
				'field' => 'aid',
			),
			'right' => array(
				'field' => 'aid',
			),
		),
		'fields' => array(
			'filename' => array(
				'name' => t('Asset: Filename'),
				'help' => t('Display the filename of the asset.'),
			),
		),
		'filters' => array(
			'extension' => array(
				'name' => t('Asset: File Extension'),
				'help' => t('TODO'),
				'operator' => views_handler_operator_eqneq(),
			),
			'dirname' => array(
				'name' =>t ('Asset: Directory'),
				'help' => t('Filter by an assets parent directory.'),
				'operator' => views_handler_operator_eqneq(),
			),
		),
	);
	return $tables;
}

