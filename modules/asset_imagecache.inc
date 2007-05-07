<?php

function imagecache_assetapi($op='list',$asset=null,$attr=array()){
  switch($op){
    case 'list':
      $presets = _imagecache_get_presets();
      foreach($presets as $id=>$name){
        $formats[$name] = array(
          'name' => $name . ' (imagecache)',
          'types' => array('jpg','gif','png'),
        );
      }
      return $formats;
    case 'options':
      if(!file_exists(file_create_path($asset->filepath))){
        imagecache_cache($attr['format'], $asset->filepath);
      }
      //$size = _asset_imagecache_get_size($attr['format'],$asset->filepath);
      $size = image_get_info(file_create_path('imagecache/'.$attr['format'].'/'.$asset->filepath));				
      $form['width'] = array(
        '#type' => 'textfield',
        '#title' => t('Width'),
        '#default_value' => $size['width'],
        '#attributes' => array('readonly'=>'readonly'),
        '#size' => 5,
      );
      $form['height'] = array(
        '#type' => 'textfield',
        '#title' => t('Height'),
        '#default_value' => $size['height'],
        '#attributes' => array('readonly'=>'readonly'),
        '#size' => 5,
      );   
      return $form;
      break;
    case 'img':
      return file_create_path('imagecache/'. $attr['format'] .'/'. $asset->filepath);
    case 'render':
      return theme('imagecache',$attr['format'],$asset->filepath);
  }
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