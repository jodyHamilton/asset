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
        if(variable_get('asset_imagecache_preset_'.$id, 1)){
          $formats[$name] = array(
            'name' => $name . ' (imagecache)',
            'types' => array('local' => array('jpg','gif','png')),
            'description' => _imagecache_asset_description($id),
          );
        }
      }
      return $formats;
    case 'options':
      $path = file_create_path('imagecache/'.$attr['format'].'/'.$asset->filepath);
      if(!file_exists($path)){
        // this is the easiest albeit indirect way i can see to generate the image
        $result = drupal_http_request(url(file_create_url($path)));
      }
      $size = image_get_info(file_create_path('imagecache/'.$attr['format'].'/'.$asset->filepath));
      $form['width'] = array('#type' => 'hidden', '#value' => $size['width']);        
      $form['height'] = array('#type' => 'hidden', '#value' => $size['height']);
              
      $form['_width'] = array(
        '#type' => 'item',
        '#title' => t('Width, preset by imagecache'),
        '#value' => $size['width'] . 'px',
      );
      $form['_height'] = array(
        '#type' => 'item',
        '#title' => t('Height, preset by imagecache'),
        '#value' => $size['height'] . 'px',
      );   
      return $form;
      break;
    case 'preview':
      return theme('imagecache', $attr['format'], $asset->filepath, $asset->title, $asset->title);
    case 'img':
      $path = file_directory_path() .'/imagecache/'. $attr['format'] .'/'. $asset->filepath;
      return $path;
    case 'render':
      return theme('imagecache',$attr['format'],$asset->filepath);
  }
}

function _imagecache_asset_description($preset_id){
  $actions = _imagecache_actions_get_by_presetid($preset_id);
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

function _asset_imagecache_get_size($name,$path){
  $preset = _imagecache_preset_load_by_name($name);
  $actions = _imagecache_actions_get_by_presetid($preset);
  $action = array_pop($actions);
  $rule = $action['data'];
  
  if(!$rule['height'] || !$rule['width']){
    $info = image_get_info(file_create_path($path));
    if(!$rule['height']){
      $aspect = $rule['width'] / $info['width'];
      $rule['height'] = $info['height'] * $aspect; 
    }else if(!$rule['width']){
      $aspect = $rule['height'] / $info['height'];
      $rule['width'] = $info['width'] * $aspect; 
    }
  }
  return $rule;
}