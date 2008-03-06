<?php

function imagecache_asset_settings(){
  $form[] = array('#value' => '<p>Select which imagecache presets should be available to use as asset formatters.</p>');
  $presets = _imagecache_get_presets();
  foreach($presets as $id=>$name){
    $formats[$name] = array(
      'name' => $name . ' (imagecache)',
      'types' => array('jpg','gif','png'),
      'description' => _imagecache_asset_description($id),
    );
    $form['asset_imagecache_preset_'.$id] = array(
      '#type' => 'checkbox',
      '#title' => $name,
      '#default_value' => variable_get('asset_imagecache_preset_'.$id, 1),
    );      
  }
  return system_settings_form($form);
}

function imagecache_asset_formatter($op='info',$asset=null,$attr=array()){
  switch($op){
    case 'info':
      $presets = _imagecache_get_presets();
      foreach($presets as $id=>$name){
        $formats[$name] = array(
          'name' => $name . ' (imagecache)',
          'description' => _imagecache_asset_description($id),
          'module' => 'imagecache',
        );
      }
      return $formats;
    case 'load':
      if($asset->type=='file' && strpos($asset->file['filemime'], 'image/') === 0){
        $presets = _imagecache_get_presets();
        foreach($presets as $id=>$name){
          $formats[] = $name;
        }
      }
      return $formats;
    case 'img':
      $path = file_directory_path() .'/imagecache/'. $attr['format'] .'/'. $asset->file['filepath'];
      return $path;
    case 'render':
      $title = $attr['title'] ? $attr['title'] : $asset->title;
      $alt = $attr['alt'] ? $attr['alt'] : $asset->title;
      return theme('imagecache', $attr['format'], $asset->file['filepath'], $alt, $title);
    case 'form':
      $form['alt'] = array(
        '#type' => 'textfield',
        '#title' => t('Alt Text'),
        '#default_value' => $attr['alt'] ? $attr['alt'] : $asset->title,
        '#description' => t('Alt attribute for the image'),
      );
      $form['title'] = array(
        '#type' => 'textfield',
        '#title' => t('Title'),
        '#default_value' => $attr['title'] ? $attr['title'] : $asset->title,
        '#description' => t('Title attribute for the image'),
      );
      $form['wysiwyg'] = array('#type' => 'hidden', '#value' => urlencode(file_create_url(file_directory_path() .'/imagecache/'. $attr['format'] .'/'. $asset->file['filepath']))); 
      return $form;
  }
}

function _imagecache_asset_description($preset_id){
  $actions = _imagecache_actions_get_by_presetid($preset_id);
  $items = array();
  foreach($actions as $action){
    switch($action['data']['function']){
      case 'scale':
        $items[] = 'Proportionally scaled to '
                 . $action['data']['fit'] . ' dimensions of '
                 . $action['data']['width'] . 'x' . $action['data']['height'] 
                 . '.';
        break;
      case 'resize':
        $items[] = 'Non-Proportionally scaled to '
                 . $action['data']['width'] . 'x' . $action['data']['height'] 
                 . '.';
        break;
      case 'crop':
        $items[] = 'Cropped to '
                 . $action['data']['width'] . 'x' . $action['data']['height'] 
                 . ' at offset '
                 . $action['data']['xoffset'] . ',' . $action['data']['yoffset'] 
                 . '.';
        break;
    }
  }
  return join($items, '  Then, ');
}
